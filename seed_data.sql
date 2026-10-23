-- ====================================================================
-- Link U (ลิงค์ ยู) - Seed Data / ข้อมูลจำลองสำหรับทดสอบระบบ
-- แพลตฟอร์มงานและทักษะ มหาวิทยาลัยแม่โจ้ (Maejo University)
-- ====================================================================
-- วิธีใช้:
-- คัดลอกคำสั่งทั้งหมดนี้ไปวางใน Supabase SQL Editor แล้วกด RUN
-- ====================================================================

-- 0. เพิ่มข้อมูลผู้ดูแลระบบ (Admins - สูงสุด 4 บัญชีตามนโยบายระบบ)
INSERT INTO public.profiles (id, email, password, full_name, role, faculty, department, year_level, phone, bio, skills, interests, avatar_url)
VALUES
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
    )
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    faculty = EXCLUDED.faculty;

-- 1. เพิ่มข้อมูลอาจารย์และบุคลากร (Instructors)
INSERT INTO public.profiles (id, email, password, full_name, role, faculty, department, year_level, phone, bio, skills, interests, avatar_url)
VALUES
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
        'อาจารย์ประจำสาขาวิชานวัตกรรมธุรกิจดิจิทัล คณะบริหารธุรกิจ มหาวิทยาลัยแม่โจ้ มุ่งเน้นการพัฒนาระบบสารสนเทศ และการเรียนรู้จากประสบการณ์จริง (Experiential Learning)',
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
        'อาจารย์และนักวิจัยด้านการประยุกต์ใช้ AI และ Internet of Things (IoT) สำหรับการเกษตรอัจฉริยะ',
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
        'หน่วยงานสนับสนุนกิจกรรม ทุนการศึกษา การฝึกงาน และการเสริมสร้างทักษะสู่โลกการทำงานจริงสำหรับนักศึกษาแม่โจ้ทุกคน',
        ARRAY['ประสานงาน', 'บริหารโครงการ', 'สื่อสารองค์กร'],
        'Student Development, Soft Skills, University Events',
        'https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?auto=format&fit=crop&w=200&q=80'
    )
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    faculty = EXCLUDED.faculty,
    department = EXCLUDED.department,
    skills = EXCLUDED.skills;

-- เพิ่มข้อมูลนักศึกษา (Students) - อ้างอิงจากคณะผู้จัดทำโครงงานในเล่มรายงาน
INSERT INTO public.profiles (id, email, password, full_name, role, faculty, department, year_level, phone, bio, skills, interests, avatar_url)
VALUES
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
    department = EXCLUDED.department,
    skills = EXCLUDED.skills;

-- 2. ข้อมูลประกาศงานและโครงการภายในมหาวิทยาลัย (Jobs)
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
    required_skills = EXCLUDED.required_skills,
    stipend = EXCLUDED.stipend,
    status = EXCLUDED.status;

-- 3. แฟ้มสะสมผลงานของนักศึกษา (Portfolios)
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

-- 4. ข้อมูลการสมัครงานและสถานะการดำเนินงาน (Applications)
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

-- 5. ข้อความแชทแบบเรียลไทม์ (Real-time Messages)
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

-- 6. ข้อมูลการประเมินและรีวิว (Reviews & Ratings)
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

-- สรุปข้อมูลที่เพิ่ม
SELECT 
    (SELECT COUNT(*) FROM public.profiles) AS total_profiles,
    (SELECT COUNT(*) FROM public.jobs) AS total_jobs,
    (SELECT COUNT(*) FROM public.applications) AS total_applications,
    (SELECT COUNT(*) FROM public.portfolios) AS total_portfolios,
    (SELECT COUNT(*) FROM public.messages) AS total_messages,
    (SELECT COUNT(*) FROM public.reviews) AS total_reviews;
