-- ====================================================================
-- Link U (ลิงค์ ยู) - Database Schema for Supabase
-- Maejo University Campus Job Matching Platform
-- ====================================================================
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Go to the "SQL Editor" tab on the left sidebar
-- 3. Paste this entire script and click "RUN"
-- 4. Enable Realtime under Database -> Replication for tables: messages, applications, notifications, jobs
-- ====================================================================

-- 1. Profiles Table (นักศึกษา / อาจารย์ / บุคลากร)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password TEXT DEFAULT '123456',
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'instructor', 'admin')),
    faculty TEXT,
    department TEXT,
    year_level TEXT,
    student_year TEXT,
    phone TEXT,
    bio TEXT,
    skills TEXT[] DEFAULT '{}',
    interests TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_year TEXT;
UPDATE public.profiles
SET student_year = CASE
    WHEN year_level ~ 'ปี[^0-9]*[1-4]'
        THEN 'ปี ' || substring(year_level FROM 'ปี[^0-9]*([1-4])')
    ELSE year_level
END
WHERE role = 'student'
  AND student_year IS NULL
  AND year_level IS NOT NULL
  AND year_level <> 'นักศึกษา';

-- 2. Portfolios Table (ผลงานและโปรเจกต์ของนักศึกษา)
CREATE TABLE IF NOT EXISTS public.portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    project_url TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Jobs Table (ประกาศงาน / โครงการภายในมหาวิทยาลัย)
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    instructor_name TEXT NOT NULL,
    department TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    required_skills TEXT[] DEFAULT '{}',
    compensation TEXT,
    stipend TEXT,
    stipend_unit TEXT,
    activity_hours INTEGER,
    activity_scope TEXT,
    benefits TEXT,
    positions INT DEFAULT 1,
    duration TEXT,
    deadline DATE,
    location TEXT DEFAULT 'มหาวิทยาลัยแม่โจ้',
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Applications Table (การสมัครงานและสถานะ)
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    student_email TEXT NOT NULL,
    student_faculty TEXT,
    message TEXT,
    portfolio_link TEXT,
    attachment_path TEXT,
    attachment_name TEXT,
    attachment_type TEXT,
    matching_score INT DEFAULT 0,
    matched_skills TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'in_progress', 'completed')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Keep existing installations compatible with the new form fields.
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS compensation TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS stipend_unit TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS activity_hours INTEGER;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS activity_scope TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS benefits TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS attachment_path TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS attachment_name TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS attachment_type TEXT;
NOTIFY pgrst, 'reload schema';
UPDATE public.jobs SET compensation = stipend, stipend = NULL
WHERE compensation IS NULL AND stipend IS NOT NULL;

-- 5. Messages Table (ระบบแชทแบบเรียลไทม์)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('student', 'instructor')),
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'link')),
    attachment_url TEXT,
    attachment_name TEXT,
    attachment_size BIGINT,
    content_type TEXT,
    link_title TEXT,
    link_description TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_name TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_size BIGINT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS content_type TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS link_title TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS link_description TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- 6. Notifications (การแจ้งเตือนผู้ใช้)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    related_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.notify_job_owner_of_application()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    job_owner UUID;
    job_title TEXT;
BEGIN
    SELECT created_by, title INTO job_owner, job_title
    FROM public.jobs
    WHERE id = NEW.job_id;

    IF job_owner IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, body, related_id)
        VALUES (
            job_owner,
            'new_application',
            'มีนักศึกษาสมัครงานใหม่',
            NEW.student_name || ' สมัครงาน: ' || COALESCE(job_title, 'โครงการ'),
            NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_notify_job_owner ON public.applications;
CREATE TRIGGER applications_notify_job_owner
AFTER INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.notify_job_owner_of_application();

-- 7. Reviews Table (การประเมินและให้คะแนนผลงานนักศึกษา)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    instructor_name TEXT NOT NULL,
    job_title TEXT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON public.jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON public.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_student_id ON public.applications(student_id);
CREATE INDEX IF NOT EXISTS idx_messages_job_id ON public.messages(job_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread_receiver ON public.messages(receiver_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_student_id ON public.reviews(student_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Frictionless Open Policies for Web Client Demo
-- (In production, replace with auth.uid() based security policies)
DROP POLICY IF EXISTS "Allow All Profiles" ON public.profiles;
CREATE POLICY "Allow All Profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow All Portfolios" ON public.portfolios;
CREATE POLICY "Allow All Portfolios" ON public.portfolios FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow All Jobs" ON public.jobs;
CREATE POLICY "Allow All Jobs" ON public.jobs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow All Applications" ON public.applications;
CREATE POLICY "Allow All Applications" ON public.applications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow All Messages" ON public.messages;
CREATE POLICY "Allow All Messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow All Notifications" ON public.notifications;
CREATE POLICY "Allow All Notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow All Reviews" ON public.reviews;
CREATE POLICY "Allow All Reviews" ON public.reviews FOR ALL USING (true) WITH CHECK (true);

-- Application files use a private bucket and short-lived signed download links.
-- This anon policy matches the demo's open-table policies; replace it with
-- auth.uid()-based ownership checks before production deployment.
INSERT INTO storage.buckets (id, name, public)
VALUES ('application-attachments', 'application-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Demo access to application attachments" ON storage.objects;
CREATE POLICY "Demo access to application attachments" ON storage.objects
    FOR ALL TO anon, authenticated
    USING (bucket_id = 'application-attachments')
    WITH CHECK (bucket_id = 'application-attachments');

-- Chat attachments use public URLs so conversation participants can open
-- previews and downloads directly from message cards. Restrict file types and size.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'chat-attachments',
    'chat-attachments',
    true,
    10485760,
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/zip',
        'image/png',
        'image/jpeg',
        'image/webp',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Demo upload chat attachments" ON storage.objects;
CREATE POLICY "Demo upload chat attachments" ON storage.objects
    FOR INSERT TO anon, authenticated
    WITH CHECK (bucket_id = 'chat-attachments');

-- Enable Realtime for Chat and Status Updates
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- ====================================================================
-- SEED DATA: ข้อมูลจำลองสำหรับทดสอบระบบ (Maejo University Sample Data)
-- ====================================================================

-- 1. Profiles (ผู้ดูแลระบบ อาจารย์ และ นักศึกษา)
INSERT INTO public.profiles (id, email, password, full_name, role, faculty, department, year_level, phone, bio, skills, interests, avatar_url)
VALUES
    -- Admin Accounts (ผู้ดูแลระบบสูงสุด 4 บัญชี)
    (
        'ad000000-0000-0000-0000-000000000001',
        'admin1',
        '123456',
        'ผู้ดูแลระบบ 1 (Admin 1)',
        'admin',
        'สำนักบริการเทคโนโลยีสารสนเทศ',
        'ศูนย์พัฒนาระบบและแพลตฟอร์มดิจิทัล',
        'System Administrator',
        '053-873-991',
        'ผู้ดูแลระบบหลัก Link U ประจำมหาวิทยาลัยแม่โจ้ ดูแลการทำงานของแพลตฟอร์ม ตรวจสอบประกาศงาน และจัดการข้อมูลระบบ',
        ARRAY['System Administration', 'Database Management', 'Security Audit', 'User Support'],
        'Platform Reliability, Campus Data Analytics, AI Matching Systems',
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
    ),
    (
        'ad000000-0000-0000-0000-000000000002',
        'admin2',
        '123456',
        'ผู้ดูแลระบบ 2 (Admin 2)',
        'admin',
        'คณะบริหารธุรกิจ',
        'ศูนย์นวัตกรรมธุรกิจดิจิทัล',
        'System Administrator',
        '053-873-992',
        'ผู้ดูแลระบบ Link U ดูแลการจับคู่งาน การตรวจสอบคุณภาพประกาศงาน และประสานงานระหว่างอาจารย์กับนักศึกษา',
        ARRAY['Data Analysis', 'Content Moderation', 'Coordination', 'Web Operations'],
        'Digital Business Innovation, Student Portfolio Quality',
        'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80'
    ),
    (
        'ad000000-0000-0000-0000-000000000003',
        'admin3',
        '123456',
        'ผู้ดูแลระบบ 3 (Admin 3)',
        'admin',
        'กองพัฒนานักศึกษา',
        'งานบริการและสวัสดิการนักศึกษา',
        'System Administrator',
        '053-873-993',
        'ผู้ดูแลระบบ Link U ฝ่ายกิจกรรมและการฝึกประสบการณ์ สนับสนุนโครงการและส่งเสริมทักษะอาชีพของนักศึกษา',
        ARRAY['Event Operations', 'Student Mentoring', 'Public Relations'],
        'Campus Job Market, Experiential Learning, Soft Skills',
        'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80'
    ),
    (
        'ad000000-0000-0000-0000-000000000004',
        'admin4',
        '123456',
        'ผู้ดูแลระบบ 4 (Admin 4)',
        'admin',
        'กองพัฒนานักศึกษา',
        'งานเทคโนโลยีดิจิทัลเพื่อการศึกษา',
        'System Administrator',
        '053-873-994',
        'ผู้ดูแลระบบ Link U ดูแลสถิติภาพรวม การประมวลผลทักษะ และดูแลความปลอดภัยของระบบ',
        ARRAY['Cybersecurity', 'Cloud Infrastructure', 'API Management'],
        'University Data Architecture, EdTech Innovations',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
    ),
    -- Instructors
    (
        'a0000000-0000-0000-0000-000000000001',
        'pichit@mju.ac.th',
        '123456',
        'อาจารย์พิชิต สิทธิกัน',
        'instructor',
        'คณะบริหารธุรกิจ',
        'สาขาวิชานวัตกรรมธุรกิจดิจิทัล',
        'ประธานที่ปรึกษาโครงงาน',
        '053-873-000',
        'อาจารย์ประจำสาขาวิชานวัตกรรมธุรกิจดิจิทัล คณะบริหารธุรกิจ มหาวิทยาลัยแม่โจ้ มุ่งเน้นการพัฒนาระบบสารสนเทศ และการเรียนรู้จากประสบการณ์จริง',
        ARRAY['Digital Innovation', 'Project Management', 'Information Systems', 'Web Technology'],
        'AI, Digital Business, Cloud Computing',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    ),
    (
        'a0000000-0000-0000-0000-000000000002',
        'somchai@mju.ac.th',
        '123456',
        'ผศ.ดร.สมชาย ปัญญาดี',
        'instructor',
        'คณะวิทยาศาสตร์',
        'สาขาวิชาวิทยาการคอมพิวเตอร์',
        'หัวหน้าโครงการวิจัยเกษตรแม่นยำ',
        '053-873-500',
        'อาจารย์และนักวิจัยด้านการประยุกต์ใช้ AI และ IoT สำหรับการเกษตรอัจฉริยะ',
        ARRAY['Python', 'Machine Learning', 'Data Science', 'IoT'],
        'Smart Farming, Precision Agriculture',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
    ),
    (
        'a0000000-0000-0000-0000-000000000003',
        'student_affairs@mju.ac.th',
        '123456',
        'กองพัฒนานักศึกษา มหาวิทยาลัยแม่โจ้',
        'instructor',
        'กองพัฒนานักศึกษา',
        'งานกิจกรรมนักศึกษาและบริการวิชาการ',
        'หน่วยงานมหาวิทยาลัย',
        '053-873-100',
        'หน่วยงานสนับสนุนกิจกรรม ทุนการศึกษา การฝึกงาน และการเสริมสร้างทักษะสู่อาชีพสำหรับนักศึกษาแม่โจ้ทุกคน',
        ARRAY['ประสานงาน', 'บริหารโครงการ', 'สื่อสารองค์กร'],
        'Student Development, Soft Skills, University Events',
        'https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?auto=format&fit=crop&w=200&q=80'
    ),
    (
        'b0000000-0000-0000-0000-000000000001',
        'chawanrat@mju.ac.th',
        '123456',
        'น.ส.ชวัลรัชต์ วงษ์คำ',
        'student',
        'คณะบริหารธุรกิจ',
        'สาขาวิชานวัตกรรมธุรกิจดิจิทัล',
        'นักศึกษาชั้นปีที่ 3 (รหัส 6606105329)',
        '081-234-5678',
        'นักศึกษาสาขานวัตกรรมธุรกิจดิจิทัล มีความเชี่ยวชาญด้าน Graphic Design, การสร้างสื่อด้วย Canva และ Figma รวมทั้งการเขียนเว็บ frontend ด้วย HTML/CSS/React',
        ARRAY['Canva', 'Graphic Design', 'Figma', 'React', 'HTML/CSS', 'ถ่ายภาพ'],
        'UX/UI Design, Web Development, Media Production',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80'
    ),
    (
        'b0000000-0000-0000-0000-000000000002',
        'tortragul@mju.ac.th',
        '123456',
        'นายต่อตระกูล ดวงสาร',
        'student',
        'คณะบริหารธุรกิจ',
        'สาขาวิชานวัตกรรมธุรกิจดิจิทัล',
        'นักศึกษาชั้นปีที่ 3 (รหัส 6606105349)',
        '082-345-6789',
        'สนใจด้านการวิเคราะห์ข้อมูลและพัฒนาระบบ สามารถเขียนโปรแกรม Python และจัดการฐานข้อมูล SQL ได้อย่างคล่องแคล่ว',
        ARRAY['Python', 'Data Analysis', 'SQL', 'Web Development', 'Canva'],
        'Machine Learning, Big Data, Business Intelligence',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'
    ),
    (
        'b0000000-0000-0000-0000-000000000003',
        'nichaporn@mju.ac.th',
        '123456',
        'น.ส.ณิชาพร อำภา',
        'student',
        'คณะบริหารธุรกิจ',
        'สาขาวิชานวัตกรรมธุรกิจดิจิทัล',
        'นักศึกษาชั้นปีที่ 3 (รหัส 6606105348)',
        '083-456-7890',
        'รักการถ่ายภาพและการตัดต่อวิดีโอ มีทักษะการใช้โปรแกรม Premiere Pro และ CapCut เพื่อผลิตคอนเทนต์ลง Social Media อย่างสร้างสรรค์',
        ARRAY['ตัดต่อวิดีโอ', 'Premiere Pro', 'ถ่ายภาพ', 'Social Media', 'Canva'],
        'Content Creator, Short-form Video, Event Photography',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80'
    ),
    (
        'b0000000-0000-0000-0000-000000000004',
        'thatsanamon@mju.ac.th',
        '123456',
        'น.ส.ทรรศน์มน ลอวิลาร',
        'student',
        'คณะบริหารธุรกิจ',
        'สาขาวิชานวัตกรรมธุรกิจดิจิทัล',
        'นักศึกษาชั้นปีที่ 3 (รหัส 6606105351)',
        '084-567-8901',
        'มีความสามารถในการประสานงาน การสื่อสารองค์กร งานพิธีกร และการจัดเตรียมเอกสารข้อมูลเชิงสถิติ',
        ARRAY['ประสานงาน', 'MC', 'สื่อสารองค์กร', 'Microsoft Excel', 'Canva'],
        'Event Management, Public Relations, Coordination',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    )
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    faculty = EXCLUDED.faculty,
    skills = EXCLUDED.skills;

-- 2. Jobs
INSERT INTO public.jobs (id, created_by, instructor_name, department, title, description, required_skills, stipend, positions, duration, deadline, location, status)
VALUES
    (
        'c0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'อาจารย์พิชิต สิทธิกัน',
        'คณะบริหารธุรกิจ',
        'ผู้ช่วยออกแบบสื่อดิจิทัลและ Infographic ประจำคณะบริหารธุรกิจ',
        'ต้องการนักศึกษาช่วยจัดทำสื่อประชาสัมพันธ์หลักสูตร โปสเตอร์กิจกรรม และภาพกราฟิกอินโฟกราฟิกสำหรับเผยแพร่บน Facebook Page และเว็บไซต์คณะบริหารธุรกิจ สามารถใช้ Canva หรือ Figma ได้เป็นอย่างดี',
        ARRAY['Canva', 'Graphic Design', 'Figma', 'สื่อสารองค์กร'],
        '350 บาท/วัน',
        2,
        '1 เดือน (พ.ย. 2568)',
        '2026-11-15',
        'อาคารเรียนคณะบริหารธุรกิจ มหาวิทยาลัยแม่โจ้',
        'open'
    ),
    (
        'c0000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000001',
        'อาจารย์พิชิต สิทธิกัน',
        'สาขาวิชานวัตกรรมธุรกิจดิจิทัล',
        'ผู้ช่วยพัฒนาระบบเว็บและโมบายแอปพลิเคชัน Link U (Frontend Developer)',
        'ร่วมพัฒนาระบบแพลตฟอร์มกลาง Link U สำหรับการจับคู่งานและทักษะของนักศึกษามหาวิทยาลัยแม่โจ้ หน้าที่รับผิดชอบประกอบด้วยการพัฒนา UI ด้วย HTML/CSS/JavaScript และเชื่อมต่อ Supabase Database',
        ARRAY['React', 'HTML/CSS', 'JavaScript', 'Figma'],
        '6,000 บาท/โครงการ',
        1,
        '2 เดือน',
        '2026-11-20',
        'ห้องปฏิบัติการนวัตกรรมดิจิทัล',
        'open'
    ),
    (
        'c0000000-0000-0000-0000-000000000003',
        'a0000000-0000-0000-0000-000000000003',
        'กองพัฒนานักศึกษา มหาวิทยาลัยแม่โจ้',
        'กองพัฒนานักศึกษา',
        'ช่างภาพนิ่งและตัดต่อวิดีโอสั้น บันทึกกิจกรรม Open House แม่โจ้',
        'รับสมัครนักศึกษาที่มีความถนัดด้านการถ่ายภาพกิจกรรม และการตัดต่อวิดีโอสั้น (Shorts / Reels / TikTok) เพื่อบันทึกบรรยากาศงานเปิดบ้านแม่โจ้และประชาสัมพันธ์ภาพลักษณ์มหาวิทยาลัย',
        ARRAY['ถ่ายภาพ', 'ตัดต่อวิดีโอ', 'Premiere Pro', 'Social Media'],
        '500 บาท/วัน + ชั่วโมงกิจกรรม 18 ชม.',
        3,
        '3 สัปดาห์',
        '2026-11-10',
        'มหาวิทยาลัยแม่โจ้ (พื้นที่จัดงานกลาง)',
        'open'
    ),
    (
        'c0000000-0000-0000-0000-000000000004',
        'a0000000-0000-0000-0000-000000000002',
        'ผศ.ดร.สมชาย ปัญญาดี',
        'คณะวิทยาศาสตร์',
        'ผู้ช่วยวิจัยด้านการวิเคราะห์ข้อมูลและ AI สำหรับการเกษตรแม่นยำ',
        'ช่วยจัดการชุดข้อมูล (Data Cleaning) และทดสอบโมเดล Machine Learning ในการพยากรณ์ผลผลิตพืชเกษตรของศูนย์วิจัย เหมาะสำหรับนักศึกษาที่ต้องการต่อยอดผลงานวิชาการและการเขียนโค้ดภาษา Python',
        ARRAY['Python', 'Data Analysis', 'SQL', 'วิเคราะห์ข้อมูล'],
        '450 บาท/วัน',
        2,
        '3 เดือน',
        '2026-11-30',
        'ศูนย์วิจัยวิทยาการคอมพิวเตอร์',
        'open'
    ),
    (
        'c0000000-0000-0000-0000-000000000005',
        'a0000000-0000-0000-0000-000000000001',
        'อาจารย์พิชิต สิทธิกัน',
        'คณะบริหารธุรกิจ',
        'ผู้ช่วยประสานงานและพิธีกร งานสัมมนาวิชาการนวัตกรรมเกษตรอินทรีย์',
        'ดำเนินงานประสานงานวิทยากร ต้อนรับผู้เข้าร่วมสัมมนา และทำหน้าที่พิธีกรภาคสนามในงานสัมมนาวิชาการระดับชาติของมหาวิทยาลัย',
        ARRAY['ประสานงาน', 'MC', 'สื่อสารองค์กร', 'Microsoft Excel'],
        '400 บาท/วัน',
        2,
        '1 สัปดาห์',
        '2026-10-25',
        'ศูนย์การศึกษาและฝึกอบรมนานาชาติ แม่โจ้',
        'closed'
    )
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    status = EXCLUDED.status;

-- 3. Portfolios
INSERT INTO public.portfolios (id, user_id, title, description, category, project_url, image_url)
VALUES
    (
        'e0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001',
        'ชุดโปสเตอร์ประชาสัมพันธ์ งานวันเกษตรแห่งชาติแม่โจ้',
        'ออกแบบสื่อประชาสัมพันธ์ทั้งภาพนิ่ง โปสเตอร์ดิจิทัล และแบนเนอร์เว็บไซต์ โดยใช้เอกลักษณ์สีเขียว-ขาวประจำแม่โจ้ ออกแบบด้วย Canva และ Photoshop',
        'Graphic & Design',
        'https://www.canva.com',
        'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=600&q=80'
    ),
    (
        'e0000000-0000-0000-0000-000000000002',
        'b0000000-0000-0000-0000-000000000001',
        'UI/UX Design - Link U Application Mobile Interface',
        'งานออกแบบ User Interface และ Interactive Prototype สำหรับแอปพลิเคชันหางานในมหาวิทยาลัย จัดวาง Grid และ Typography ตามหลัก Ergonomics ใน Figma',
        'Web & Application',
        'https://www.figma.com',
        'https://images.unsplash.com/photo-1581291518655-9523c932edcf?auto=format&fit=crop&w=600&q=80'
    ),
    (
        'e0000000-0000-0000-0000-000000000003',
        'b0000000-0000-0000-0000-000000000002',
        'ระบบพยากรณ์คุณภาพน้ำเพื่อบ่อเลี้ยงสัตว์น้ำแม่โจ้ด้วย Python',
        'โปรเจกต์การวิเคราะห์ข้อมูลและพัฒนาโมเดล Linear Regression และ Random Forest ในการตรวจสอบคุณภาพน้ำและออกรายงานอัตโนมัติ',
        'Research & Academic',
        'https://github.com',
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80'
    ),
    (
        'e0000000-0000-0000-0000-000000000004',
        'b0000000-0000-0000-0000-000000000003',
        'วิดีโอแนะนำสาขาวิชานวัตกรรมธุรกิจดิจิทัล Maejo Digital Innovation',
        'ถ่ายทำและตัดต่อวิดีโอโปรโมทสาขาวิชา ความยาว 3 นาที ใช้เพลงประกอบและกราฟิกเคลื่อนไหว ได้รับยอดวิวทะลุ 10,000 ครั้งบนช่องทาง TikTok',
        'Video & Media',
        'https://youtube.com',
        'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80'
    )
ON CONFLICT (id) DO NOTHING;

-- 4. Applications
INSERT INTO public.applications (id, job_id, student_id, student_name, student_email, student_faculty, message, portfolio_link, matching_score, matched_skills, status)
VALUES
    (
        'd0000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001',
        'น.ส.ชวัลรัชต์ วงษ์คำ',
        'chawanrat@mju.ac.th',
        'คณะบริหารธุรกิจ',
        'หนูมีความสนใจตำแหน่งผู้ช่วยออกแบบสื่ออย่างยิ่งค่ะ เคยมีผลงานจัดทำโปสเตอร์ของคณะและสามารถใช้ Canva/Figma ได้อย่างชำนาญ พร้อมเริ่มงานได้ทันทีค่ะ',
        'https://www.canva.com',
        95,
        ARRAY['Canva', 'Graphic Design', 'Figma'],
        'completed'
    ),
    (
        'd0000000-0000-0000-0000-000000000002',
        'c0000000-0000-0000-0000-000000000002',
        'b0000000-0000-0000-0000-000000000001',
        'น.ส.ชวัลรัชต์ วงษ์คำ',
        'chawanrat@mju.ac.th',
        'คณะบริหารธุรกิจ',
        'มีความพร้อมในการช่วยพัฒนาหน้าจอ Frontend ของระบบ Link U โดยใช้ React และ CSS ได้ศึกษาโครงสร้างระบบมาอย่างต่อเนื่องค่ะ',
        'https://github.com',
        88,
        ARRAY['React', 'HTML/CSS', 'Figma'],
        'in_progress'
    ),
    (
        'd0000000-0000-0000-0000-000000000003',
        'c0000000-0000-0000-0000-000000000003',
        'b0000000-0000-0000-0000-000000000003',
        'น.ส.ณิชาพร อำภา',
        'nichaporn@mju.ac.th',
        'คณะบริหารธุรกิจ',
        'มีกล้อง Sony และอุปกรณ์พร้อมสำหรับการถ่ายทำ สามารถถ่ายภาพนิ่งและตัดต่อคลิปสั้นลง Reels ได้ทันท่วงทีตามกำหนดการงานค่ะ',
        'https://youtube.com',
        92,
        ARRAY['ถ่ายภาพ', 'ตัดต่อวิดีโอ', 'Premiere Pro', 'Social Media'],
        'approved'
    ),
    (
        'd0000000-0000-0000-0000-000000000004',
        'c0000000-0000-0000-0000-000000000004',
        'b0000000-0000-0000-0000-000000000002',
        'นายต่อตระกูล ดวงสาร',
        'tortragul@mju.ac.th',
        'คณะบริหารธุรกิจ',
        'สนใจเรียนรู้การประยุกต์ใช้โมเดล Machine Learning ในข้อมูลภาคสนามจริง มีความรู้พื้นฐานเรื่อง Pandas, NumPy และการเขียนคำสั่ง SQL ครับ',
        'https://github.com',
        90,
        ARRAY['Python', 'Data Analysis', 'SQL'],
        'pending'
    )
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    matching_score = EXCLUDED.matching_score;

-- 5. Messages (Real-time Chat)
INSERT INTO public.messages (id, job_id, sender_id, sender_name, sender_role, receiver_id, content, created_at)
VALUES
    (
        'f0000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001',
        'น.ส.ชวัลรัชต์ วงษ์คำ',
        'student',
        'a0000000-0000-0000-0000-000000000001',
        'สวัสดีค่ะอาจารย์พิชิต หนูได้ส่งร่างแบบโปสเตอร์ประชาสัมพันธ์ชุดแรกให้ตรวจสอบเรียบร้อยแล้วนะคะ',
        NOW() - INTERVAL '2 days'
    ),
    (
        'f0000000-0000-0000-0000-000000000002',
        'c0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'อาจารย์พิชิต สิทธิกัน',
        'instructor',
        'b0000000-0000-0000-0000-000000000001',
        'อาจารย์ตรวจดูแล้วครับ งานออกแบบสวยงามและโทนสีถูกต้องตามอัตลักษณ์มหาวิทยาลัยมาก ปรับขนาดหัวข้อกิจกรรมให้เด่นขึ้นอีกนิดก็ส่งพิมพ์ได้เลยครับ',
        NOW() - INTERVAL '1 day'
    ),
    (
        'f0000000-0000-0000-0000-000000000003',
        'c0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001',
        'น.ส.ชวัลรัชต์ วงษ์คำ',
        'student',
        'a0000000-0000-0000-0000-000000000001',
        'แก้ไขขนาดหัวข้อเรียบร้อยแล้วค่ะอาจารย์ ขอบคุณสำหรับคำแนะนำมากๆ ค่ะ!',
        NOW() - INTERVAL '18 hours'
    ),
    (
        'f0000000-0000-0000-0000-000000000004',
        'c0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'อาจารย์พิชิต สิทธิกัน',
        'instructor',
        'b0000000-0000-0000-0000-000000000001',
        'ยอดเยี่ยมมากครับ โครงการเสร็จสิ้นสมบูรณ์ อาจารย์บันทึกคะแนนประเมินและรีวิวให้ในระบบเรียบร้อยแล้วนะ',
        NOW() - INTERVAL '10 hours'
    )
ON CONFLICT (id) DO NOTHING;

-- 6. Reviews
INSERT INTO public.reviews (id, application_id, job_id, student_id, instructor_id, instructor_name, job_title, rating, comment, created_at)
VALUES
    (
        '90000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'อาจารย์พิชิต สิทธิกัน',
        'ผู้ช่วยออกแบบสื่อดิจิทัลและ Infographic ประจำคณะบริหารธุรกิจ',
        5,
        'นักศึกษามีทักษะการออกแบบสื่อที่ยอดเยี่ยมและตรงตามโจทย์ มีความคิดสร้างสรรค์ ส่งมอบงานตรงเวลา มีความรับผิดชอบและสื่อสารประสานงานได้เป็นมืออาชีพมาก ชื่นชมครับ',
        NOW() - INTERVAL '10 hours'
    )
ON CONFLICT (id) DO NOTHING;
