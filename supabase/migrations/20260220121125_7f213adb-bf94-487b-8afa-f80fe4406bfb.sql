CREATE TRIGGER on_quiz_submission_check_completion
  AFTER INSERT ON public.quiz_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_session_completion();