CREATE OR REPLACE FUNCTION public.submit_quiz_answers(p_quiz_id uuid, p_answers jsonb)
 RETURNS TABLE(submission_id uuid, score integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_quiz RECORD;
  v_questions JSONB;
  v_total_questions INTEGER;
  v_total_graded INTEGER := 0;
  v_correct_count INTEGER := 0;
  v_calculated_score INTEGER;
  v_submission_id UUID;
  v_question JSONB;
  v_question_id TEXT;
  v_type TEXT;
  v_answer_raw JSONB;
  v_answer_int INTEGER;
  v_answer_text TEXT;
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

  -- Validate and score each question based on its type
  FOR i IN 0..v_total_questions - 1 LOOP
    v_question := v_questions->i;
    v_question_id := v_question->>'id';
    v_type := COALESCE(v_question->>'type', 'mcq');

    -- Check if answer exists for this question
    IF NOT p_answers ? v_question_id THEN
      RAISE EXCEPTION 'Missing answer for question %', v_question_id;
    END IF;

    v_answer_raw := p_answers->v_question_id;

    IF v_type = 'subjective' THEN
      -- Require non-empty string, max 1000 chars
      IF jsonb_typeof(v_answer_raw) <> 'string' THEN
        RAISE EXCEPTION 'Subjective answer must be a string for question %', v_question_id;
      END IF;
      v_answer_text := p_answers->>v_question_id;
      IF length(trim(v_answer_text)) = 0 THEN
        RAISE EXCEPTION 'Subjective answer cannot be empty for question %', v_question_id;
      END IF;
      IF length(v_answer_text) > 1000 THEN
        RAISE EXCEPTION 'Subjective answer exceeds 1000 character limit for question %', v_question_id;
      END IF;
      -- Not scored
    ELSIF v_type = 'mcq_ungraded' THEN
      v_answer_int := (p_answers->>v_question_id)::INTEGER;
      IF v_answer_int < 0 OR v_answer_int >= jsonb_array_length(v_question->'options') THEN
        RAISE EXCEPTION 'Invalid answer index % for question %', v_answer_int, v_question_id;
      END IF;
      -- Not scored
    ELSE
      -- 'mcq' (default, graded)
      v_answer_int := (p_answers->>v_question_id)::INTEGER;
      IF v_answer_int < 0 OR v_answer_int >= jsonb_array_length(v_question->'options') THEN
        RAISE EXCEPTION 'Invalid answer index % for question %', v_answer_int, v_question_id;
      END IF;
      v_correct_answer := (v_question->>'correctAnswer')::INTEGER;
      v_total_graded := v_total_graded + 1;
      IF v_answer_int = v_correct_answer THEN
        v_correct_count := v_correct_count + 1;
      END IF;
    END IF;
  END LOOP;

  -- Calculate score as percentage (NULL when no graded questions)
  IF v_total_graded > 0 THEN
    v_calculated_score := ROUND((v_correct_count::NUMERIC / v_total_graded::NUMERIC) * 100);
  ELSE
    v_calculated_score := NULL;
  END IF;

  -- Insert the submission
  INSERT INTO quiz_submissions (quiz_id, user_id, answers, score)
  VALUES (p_quiz_id, v_user_id, p_answers, v_calculated_score)
  RETURNING id INTO v_submission_id;

  RETURN QUERY SELECT v_submission_id, v_calculated_score;
END;
$function$;