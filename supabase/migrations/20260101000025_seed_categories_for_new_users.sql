-- Create a function to seed default categories for new users
-- This is triggered when a new user signs up via Supabase Auth

CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, color, sort_order) VALUES
    (NEW.id, 'Work', '#3B82F6', 1),
    (NEW.id, 'Consulting', '#8B5CF6', 2),
    (NEW.id, 'Home', '#10B981', 3),
    (NEW.id, 'Kids', '#F59E0B', 4),
    (NEW.id, 'Personal', '#EC4899', 5);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on new user creation in auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_default_categories();
