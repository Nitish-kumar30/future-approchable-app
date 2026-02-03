-- Create a secure function to submit quiz answers with server-side validation and score calculation
CREATE OR REPLACE FUNCTION public.submit_quiz_answers(
  p_quiz_id UUID,
  p_answers JSONB
)
RETURNS TABLE(submission_id UUID, score INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_quiz RECORD;
  v_questions JSONB;
  v_total_questions INTEGER;
  v_correct_count INTEGER := 0;
  v_calculated_score INTEGER;
  v_submission_id UUID;
  v_question JSONB;
  v_question_id TEXT;
  v_answer INTEGER;
  v_correct_answer INTEGER;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to submit quiz';
  END IF;

  -- Fetch the quiz and verify it exists
  SELECT q.id, q.questions INTO v_quiz
  FROM quizzes q
  WHERE q.id = p_quiz_id;

  IF v_quiz.id IS NULL THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;

  v_questions := v_quiz.questions;
  v_total_questions := jsonb_array_length(v_questions);

  IF v_total_questions = 0 THEN
    RAISE EXCEPTION 'Quiz has no questions';
  END IF;

  -- Validate that all questions have been answered and answers are valid
  FOR i IN 0..v_total_questions - 1 LOOP
    v_question := v_questions->i;
    v_question_id := v_question->>'id';
    
    -- Check if answer exists for this question
    IF NOT p_answers ? v_question_id THEN
      RAISE EXCEPTION 'Missing answer for question %', v_question_id;
    END IF;

    -- Get the submitted answer
    v_answer := (p_answers->>v_question_id)::INTEGER;
    
    -- Validate answer is within valid range (0 to options length - 1)
    IF v_answer < 0 OR v_answer >= jsonb_array_length(v_question->'options') THEN
      RAISE EXCEPTION 'Invalid answer index % for question %', v_answer, v_question_id;
    END IF;

    -- Check if answer is correct
    v_correct_answer := (v_question->>'correctAnswer')::INTEGER;
    IF v_answer = v_correct_answer THEN
      v_correct_count := v_correct_count + 1;
    END IF;
  END LOOP;

  -- Calculate score as percentage
  v_calculated_score := ROUND((v_correct_count::NUMERIC / v_total_questions::NUMERIC) * 100);

  -- Insert the submission
  INSERT INTO quiz_submissions (quiz_id, user_id, answers, score)
  VALUES (p_quiz_id, v_user_id, p_answers, v_calculated_score)
  RETURNING id INTO v_submission_id;

  RETURN QUERY SELECT v_submission_id, v_calculated_score;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.submit_quiz_answers(UUID, JSONB) TO authenticated;