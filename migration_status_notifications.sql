-- Apply this migration to an existing Link U Supabase project.
ALTER TABLE public.applications
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL;

CREATE OR REPLACE FUNCTION public.notify_student_of_application_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    job_title TEXT;
    status_label TEXT;
BEGIN
    SELECT title INTO job_title
    FROM public.jobs
    WHERE id = NEW.job_id;

    status_label := CASE NEW.status
        WHEN 'pending' THEN 'รอพิจารณา'
        WHEN 'approved' THEN 'อนุมัติ / รับเข้าทำงาน'
        WHEN 'in_progress' THEN 'กำลังดำเนินงาน'
        WHEN 'completed' THEN 'เสร็จสิ้นโครงการ'
        WHEN 'rejected' THEN 'ไม่ผ่านการคัดเลือก'
        ELSE NEW.status
    END;

    INSERT INTO public.notifications (user_id, type, title, body, related_id)
    VALUES (
        NEW.student_id,
        'application_status_update',
        'อาจารย์อัปเดตสถานะใบสมัคร',
        'อาจารย์ได้อัปเดตสถานะงาน ' || COALESCE(job_title, 'โครงการ') || ' เป็น ' || status_label || ' แล้ว',
        NEW.id
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_notify_student_status ON public.applications;
CREATE TRIGGER applications_notify_student_status
AFTER UPDATE OF status ON public.applications
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.notify_student_of_application_status();

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;
