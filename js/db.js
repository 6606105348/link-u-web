// Link U - Unified Supabase Database Layer
// Handles real Supabase operations with automatic fallback to local persistence
import { SupabaseConfig } from './supabase-config.js';

let supabaseClient = null;
let realtimeChannel = null;
let applicationsChannel = null;
let notificationsChannel = null;

// Initialize Supabase Client if credentials are valid
export function getSupabase() {
    if (supabaseClient) return supabaseClient;

    const config = SupabaseConfig.getConfig();
    if (config.url && config.key && window.supabase) {
        try {
            supabaseClient = window.supabase.createClient(config.url, config.key, {
                realtime: {
                    params: {
                        eventsPerSecond: 10
                    }
                }
            });
            console.log('✅ Supabase Client initialized successfully with:', config.url);
        } catch (e) {
            console.error('Failed to create Supabase client:', e);
        }
    }
    return supabaseClient;
}

export function resetSupabaseClient() {
    supabaseClient = null;
    return getSupabase();
}

export const DEFAULT_SEED_DATA = {
    profiles: [
        {
            id: 'ad000000-0000-0000-0000-000000000001',
            email: 'admin1',
            full_name: 'ผู้ดูแลระบบ 1 (Admin 1)',
            role: 'admin',
            faculty: 'สำนักบริการเทคโนโลยีสารสนเทศ',
            department: 'ศูนย์พัฒนาระบบและแพลตฟอร์มดิจิทัล',
            year_level: 'System Administrator',
            phone: '053-873-991',
            bio: 'ผู้ดูแลระบบหลัก Link U ประจำมหาวิทยาลัยแม่โจ้ ดูแลการทำงานของแพลตฟอร์ม ตรวจสอบประกาศงาน และจัดการข้อมูลระบบ',
            skills: ['System Administration', 'Database Management', 'Security Audit', 'User Support'],
            interests: 'Platform Reliability, Campus Data Analytics, AI Matching Systems',
            avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
            password: '123456'
        },
        {
            id: 'ad000000-0000-0000-0000-000000000002',
            email: 'admin2',
            full_name: 'ผู้ดูแลระบบ 2 (Admin 2)',
            role: 'admin',
            faculty: 'คณะบริหารธุรกิจ',
            department: 'ศูนย์นวัตกรรมธุรกิจดิจิทัล',
            year_level: 'System Administrator',
            phone: '053-873-992',
            bio: 'ผู้ดูแลระบบ Link U ดูแลการจับคู่งาน การตรวจสอบคุณภาพประกาศงาน และประสานงานระหว่างอาจารย์กับนักศึกษา',
            skills: ['Data Analysis', 'Content Moderation', 'Coordination', 'Web Operations'],
            interests: 'Digital Business Innovation, Student Portfolio Quality',
            avatar_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80',
            password: '123456'
        },
        {
            id: 'ad000000-0000-0000-0000-000000000003',
            email: 'admin3',
            full_name: 'ผู้ดูแลระบบ 3 (Admin 3)',
            role: 'admin',
            faculty: 'กองพัฒนานักศึกษา',
            department: 'งานบริการและสวัสดิการนักศึกษา',
            year_level: 'System Administrator',
            phone: '053-873-993',
            bio: 'ผู้ดูแลระบบ Link U ฝ่ายกิจกรรมและการฝึกประสบการณ์ สนับสนุนโครงการและส่งเสริมทักษะอาชีพของนักศึกษา',
            skills: ['Event Operations', 'Student Mentoring', 'Public Relations'],
            interests: 'Campus Job Market, Experiential Learning, Soft Skills',
            avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
            password: '123456'
        },
        {
            id: 'ad000000-0000-0000-0000-000000000004',
            email: 'admin4',
            full_name: 'ผู้ดูแลระบบ 4 (Admin 4)',
            role: 'admin',
            faculty: 'คณะวิทยาศาสตร์',
            department: 'ศูนย์เทคโนโลยีสารสนเทศ',
            year_level: 'System Administrator',
            phone: '053-873-994',
            bio: 'ผู้ดูแลระบบ Link U ด้านความปลอดภัยข้อมูลและการบริหารจัดการฐานข้อมูล Supabase',
            skills: ['Information Security', 'Cloud Infrastructure', 'Database Optimization'],
            interests: 'Data Privacy, Cloud Scaling, High Availability',
            avatar_url: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=200&q=80',
            password: '123456'
        },
        {
            id: 'a0000000-0000-0000-0000-000000000001',
            email: 'pichit@mju.ac.th',
            full_name: 'อาจารย์พิชิต สิทธิกัน',
            role: 'instructor',
            faculty: 'คณะบริหารธุรกิจ',
            department: 'สาขาวิชานวัตกรรมธุรกิจดิจิทัล',
            year_level: 'ประธานที่ปรึกษาโครงงาน',
            phone: '053-873-000',
            bio: 'อาจารย์ประจำสาขาวิชานวัตกรรมธุรกิจดิจิทัล คณะบริหารธุรกิจ มหาวิทยาลัยแม่โจ้ มุ่งเน้นการพัฒนาระบบสารสนเทศ และการเรียนรู้จากประสบการณ์จริง',
            skills: ['Digital Innovation', 'Project Management', 'Information Systems', 'Web Technology'],
            interests: 'AI, Digital Business, Cloud Computing',
            avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
            password: '123456'
        },
        {
            id: 'a0000000-0000-0000-0000-000000000002',
            email: 'somchai@mju.ac.th',
            full_name: 'ผศ.ดร.สมชาย ปัญญาดี',
            role: 'instructor',
            faculty: 'คณะวิทยาศาสตร์',
            department: 'สาขาวิชาวิทยาการคอมพิวเตอร์',
            year_level: 'หัวหน้าโครงการวิจัยเกษตรแม่นยำ',
            phone: '053-873-500',
            bio: 'อาจารย์และนักวิจัยด้านการประยุกต์ใช้ AI และ IoT สำหรับการเกษตรอัจฉริยะ',
            skills: ['Python', 'Machine Learning', 'Data Science', 'IoT'],
            interests: 'Smart Farming, Precision Agriculture',
            avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
            password: '123456'
        },
        {
            id: 'a0000000-0000-0000-0000-000000000003',
            email: 'student_affairs@mju.ac.th',
            full_name: 'กองพัฒนานักศึกษา มหาวิทยาลัยแม่โจ้',
            role: 'instructor',
            faculty: 'กองพัฒนานักศึกษา',
            department: 'งานกิจกรรมนักศึกษาและบริการวิชาการ',
            year_level: 'หน่วยงานมหาวิทยาลัย',
            phone: '053-873-100',
            bio: 'หน่วยงานสนับสนุนกิจกรรม ทุนการศึกษา การฝึกงาน และการเสริมสร้างทักษะสู่อาชีพสำหรับนักศึกษาแม่โจ้ทุกคน',
            skills: ['ประสานงาน', 'บริหารโครงการ', 'สื่อสารองค์กร'],
            interests: 'Student Development, Soft Skills, University Events',
            avatar_url: 'https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?auto=format&fit=crop&w=200&q=80',
            password: '123456'
        },
        {
            id: 'b0000000-0000-0000-0000-000000000001',
            email: 'chawanrat@mju.ac.th',
            full_name: 'น.ส.ชวัลรัชต์ วงษ์คำ',
            role: 'student',
            faculty: 'คณะบริหารธุรกิจ',
            department: 'สาขาวิชานวัตกรรมธุรกิจดิจิทัล',
            year_level: 'นักศึกษาชั้นปีที่ 3 (รหัส 6606105329)',
            phone: '081-234-5678',
            bio: 'นักศึกษาสาขานวัตกรรมธุรกิจดิจิทัล มีความเชี่ยวชาญด้าน Graphic Design, การสร้างสื่อด้วย Canva และ Figma รวมทั้งการเขียนเว็บ frontend ด้วย HTML/CSS/React',
            skills: ['Canva', 'Graphic Design', 'Figma', 'React', 'HTML/CSS', 'ถ่ายภาพ'],
            interests: 'UX/UI Design, Web Development, Media Production',
            avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
            password: '123456'
        },
        {
            id: 'b0000000-0000-0000-0000-000000000002',
            email: 'tortragul@mju.ac.th',
            full_name: 'นายต่อตระกูล ดวงสาร',
            role: 'student',
            faculty: 'คณะบริหารธุรกิจ',
            department: 'สาขาวิชานวัตกรรมธุรกิจดิจิทัล',
            year_level: 'นักศึกษาชั้นปีที่ 3 (รหัส 6606105349)',
            phone: '082-345-6789',
            bio: 'สนใจด้านการวิเคราะห์ข้อมูลและพัฒนาระบบ สามารถเขียนโปรแกรม Python และจัดการฐานข้อมูล SQL ได้อย่างคล่องแคล่ว',
            skills: ['Python', 'Data Analysis', 'SQL', 'Web Development', 'Canva'],
            interests: 'Machine Learning, Big Data, Business Intelligence',
            avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
            password: '123456'
        },
        {
            id: 'b0000000-0000-0000-0000-000000000003',
            email: 'nichaporn@mju.ac.th',
            full_name: 'น.ส.ณิชาพร อำภา',
            role: 'student',
            faculty: 'คณะบริหารธุรกิจ',
            department: 'สาขาวิชานวัตกรรมธุรกิจดิจิทัล',
            year_level: 'นักศึกษาชั้นปีที่ 3 (รหัส 6606105348)',
            phone: '083-456-7890',
            bio: 'รักการถ่ายภาพและการตัดต่อวิดีโอ มีทักษะการใช้โปรแกรม Premiere Pro และ CapCut เพื่อผลิตคอนเทนต์ลง Social Media อย่างสร้างสรรค์',
            skills: ['ตัดต่อวิดีโอ', 'Premiere Pro', 'ถ่ายภาพ', 'Social Media', 'Canva'],
            interests: 'Content Creator, Short-form Video, Event Photography',
            avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
            password: '123456'
        },
        {
            id: 'b0000000-0000-0000-0000-000000000004',
            email: 'thatsanamon@mju.ac.th',
            full_name: 'น.ส.ทรรศน์มน ลอวิลาร',
            role: 'student',
            faculty: 'คณะบริหารธุรกิจ',
            department: 'สาขาวิชานวัตกรรมธุรกิจดิจิทัล',
            year_level: 'นักศึกษาชั้นปีที่ 3 (รหัส 6606105351)',
            phone: '084-567-8901',
            bio: 'มีความสามารถในการประสานงาน การสื่อสารองค์กร งานพิธีกร และการจัดเตรียมเอกสารข้อมูลเชิงสถิติ',
            skills: ['ประสานงาน', 'MC', 'สื่อสารองค์กร', 'Microsoft Excel', 'Canva'],
            interests: 'Event Management, Public Relations, Coordination',
            avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
            password: '123456'
        }
    ],
    jobs: [
        {
            id: 'c0000000-0000-0000-0000-000000000001',
            created_by: 'a0000000-0000-0000-0000-000000000001',
            instructor_name: 'อาจารย์พิชิต สิทธิกัน',
            department: 'คณะบริหารธุรกิจ',
            title: 'ผู้ช่วยออกแบบสื่อดิจิทัลและ Infographic ประจำคณะบริหารธุรกิจ',
            description: 'ต้องการนักศึกษาช่วยจัดทำสื่อประชาสัมพันธ์หลักสูตร โปสเตอร์กิจกรรม และภาพกราฟิกอินโฟกราฟิกสำหรับเผยแพร่บน Facebook Page และเว็บไซต์คณะบริหารธุรกิจ สามารถใช้ Canva หรือ Figma ได้เป็นอย่างดี',
            required_skills: ['Canva', 'Graphic Design', 'Figma', 'สื่อสารองค์กร'],
            stipend: '350 บาท/วัน',
            positions: 2,
            duration: '1 เดือน (พ.ย. 2568)',
            deadline: '2026-11-15',
            location: 'อาคารเรียนคณะบริหารธุรกิจ มหาวิทยาลัยแม่โจ้',
            status: 'open',
            created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
        },
        {
            id: 'c0000000-0000-0000-0000-000000000002',
            created_by: 'a0000000-0000-0000-0000-000000000001',
            instructor_name: 'อาจารย์พิชิต สิทธิกัน',
            department: 'สาขาวิชานวัตกรรมธุรกิจดิจิทัล',
            title: 'ผู้ช่วยพัฒนาระบบเว็บและโมบายแอปพลิเคชัน Link U (Frontend Developer)',
            description: 'ร่วมพัฒนาระบบแพลตฟอร์มกลาง Link U สำหรับการจับคู่งานและทักษะของนักศึกษามหาวิทยาลัยแม่โจ้ หน้าที่รับผิดชอบประกอบด้วยการพัฒนา UI ด้วย HTML/CSS/JavaScript และเชื่อมต่อ Supabase Database',
            required_skills: ['React', 'HTML/CSS', 'JavaScript', 'Figma'],
            stipend: '6,000 บาท/โครงการ',
            positions: 1,
            duration: '2 เดือน',
            deadline: '2026-11-20',
            location: 'ห้องปฏิบัติการนวัตกรรมดิจิทัล',
            status: 'open',
            created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
        },
        {
            id: 'c0000000-0000-0000-0000-000000000003',
            created_by: 'a0000000-0000-0000-0000-000000000003',
            instructor_name: 'กองพัฒนานักศึกษา มหาวิทยาลัยแม่โจ้',
            department: 'กองพัฒนานักศึกษา',
            title: 'ช่างภาพนิ่งและตัดต่อวิดีโอสั้น บันทึกกิจกรรม Open House แม่โจ้',
            description: 'รับสมัครนักศึกษาที่มีความถนัดด้านการถ่ายภาพกิจกรรม และการตัดต่อวิดีโอสั้น (Shorts / Reels / TikTok) เพื่อบันทึกบรรยากาศงานเปิดบ้านแม่โจ้และประชาสัมพันธ์ภาพลักษณ์มหาวิทยาลัย',
            required_skills: ['ถ่ายภาพ', 'ตัดต่อวิดีโอ', 'Premiere Pro', 'Social Media'],
            stipend: '500 บาท/วัน + ชั่วโมงกิจกรรม 18 ชม.',
            positions: 3,
            duration: '3 สัปดาห์',
            deadline: '2026-11-10',
            location: 'มหาวิทยาลัยแม่โจ้ (พื้นที่จัดงานกลาง)',
            status: 'open',
            created_at: new Date(Date.now() - 3600000 * 24 * 1).toISOString()
        },
        {
            id: 'c0000000-0000-0000-0000-000000000004',
            created_by: 'a0000000-0000-0000-0000-000000000002',
            instructor_name: 'ผศ.ดร.สมชาย ปัญญาดี',
            department: 'คณะวิทยาศาสตร์',
            title: 'ผู้ช่วยวิจัยด้านการวิเคราะห์ข้อมูลและ AI สำหรับการเกษตรแม่นยำ',
            description: 'ช่วยจัดการชุดข้อมูล (Data Cleaning) และทดสอบโมเดล Machine Learning ในการพยากรณ์ผลผลิตพืชเกษตรของศูนย์วิจัย เหมาะสำหรับนักศึกษาที่ต้องการต่อยอดผลงานวิชาการและการเขียนโค้ดภาษา Python',
            required_skills: ['Python', 'Data Analysis', 'SQL', 'วิเคราะห์ข้อมูล'],
            stipend: '450 บาท/วัน',
            positions: 2,
            duration: '3 เดือน',
            deadline: '2026-11-30',
            location: 'ศูนย์วิจัยวิทยาการคอมพิวเตอร์',
            status: 'open',
            created_at: new Date(Date.now() - 3600000 * 18).toISOString()
        },
        {
            id: 'c0000000-0000-0000-0000-000000000005',
            created_by: 'a0000000-0000-0000-0000-000000000001',
            instructor_name: 'อาจารย์พิชิต สิทธิกัน',
            department: 'คณะบริหารธุรกิจ',
            title: 'ผู้ช่วยประสานงานและพิธีกร งานสัมมนาวิชาการนวัตกรรมเกษตรอินทรีย์',
            description: 'ดำเนินงานประสานงานวิทยากร ต้อนรับผู้เข้าร่วมสัมมนา และทำหน้าที่พิธีกรภาคสนามในงานสัมมนาวิชาการระดับชาติของมหาวิทยาลัย',
            required_skills: ['ประสานงาน', 'MC', 'สื่อสารองค์กร', 'Microsoft Excel'],
            stipend: '400 บาท/วัน',
            positions: 2,
            duration: '1 สัปดาห์',
            deadline: '2026-10-25',
            location: 'ศูนย์การศึกษาและฝึกอบรมนานาชาติ แม่โจ้',
            status: 'closed',
            created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString()
        }
    ],
    portfolios: [
        {
            id: 'e0000000-0000-0000-0000-000000000001',
            user_id: 'b0000000-0000-0000-0000-000000000001',
            title: 'ชุดโปสเตอร์ประชาสัมพันธ์ งานวันเกษตรแห่งชาติแม่โจ้',
            description: 'ออกแบบสื่อประชาสัมพันธ์ทั้งภาพนิ่ง โปสเตอร์ดิจิทัล และแบนเนอร์เว็บไซต์ โดยใช้เอกลักษณ์สีเขียว-ขาวประจำแม่โจ้ ออกแบบด้วย Canva และ Photoshop',
            category: 'Graphic & Design',
            project_url: 'https://www.canva.com',
            image_url: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=600&q=80',
            created_at: new Date(Date.now() - 3600000 * 24 * 7).toISOString()
        },
        {
            id: 'e0000000-0000-0000-0000-000000000002',
            user_id: 'b0000000-0000-0000-0000-000000000001',
            title: 'UI/UX Design - Link U Application Mobile Interface',
            description: 'งานออกแบบ User Interface และ Interactive Prototype สำหรับแอปพลิเคชันหางานในมหาวิทยาลัย จัดวาง Grid และ Typography ตามหลัก Ergonomics ใน Figma',
            category: 'Web & Application',
            project_url: 'https://www.figma.com',
            image_url: 'https://images.unsplash.com/photo-1581291518655-9523c932edcf?auto=format&fit=crop&w=600&q=80',
            created_at: new Date(Date.now() - 3600000 * 24 * 4).toISOString()
        }
    ],
    applications: [
        {
            id: 'd0000000-0000-0000-0000-000000000001',
            job_id: 'c0000000-0000-0000-0000-000000000001',
            student_id: 'b0000000-0000-0000-0000-000000000001',
            student_name: 'น.ส.ชวัลรัชต์ วงษ์คำ',
            student_email: 'chawanrat@mju.ac.th',
            student_faculty: 'คณะบริหารธุรกิจ',
            message: 'หนูมีความสนใจตำแหน่งผู้ช่วยออกแบบสื่ออย่างยิ่งค่ะ เคยมีผลงานจัดทำโปสเตอร์ของคณะและสามารถใช้ Canva/Figma ได้อย่างชำนาญ พร้อมเริ่มงานได้ทันทีค่ะ',
            portfolio_link: 'https://www.canva.com',
            matching_score: 95,
            matched_skills: ['Canva', 'Graphic Design', 'Figma'],
            status: 'completed',
            created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
        },
        {
            id: 'd0000000-0000-0000-0000-000000000002',
            job_id: 'c0000000-0000-0000-0000-000000000002',
            student_id: 'b0000000-0000-0000-0000-000000000001',
            student_name: 'น.ส.ชวัลรัชต์ วงษ์คำ',
            student_email: 'chawanrat@mju.ac.th',
            student_faculty: 'คณะบริหารธุรกิจ',
            message: 'มีความพร้อมในการช่วยพัฒนาหน้าจอ Frontend ของระบบ Link U โดยใช้ React และ CSS ได้ศึกษาโครงสร้างระบบมาอย่างต่อเนื่องค่ะ',
            portfolio_link: 'https://github.com',
            matching_score: 88,
            matched_skills: ['React', 'HTML/CSS', 'Figma'],
            status: 'in_progress',
            created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
        },
        {
            id: 'd0000000-0000-0000-0000-000000000003',
            job_id: 'c0000000-0000-0000-0000-000000000003',
            student_id: 'b0000000-0000-0000-0000-000000000003',
            student_name: 'น.ส.ณิชาพร อำภา',
            student_email: 'nichaporn@mju.ac.th',
            student_faculty: 'คณะบริหารธุรกิจ',
            message: 'มีกล้อง Sony และอุปกรณ์พร้อมสำหรับการถ่ายทำ สามารถถ่ายภาพนิ่งและตัดต่อคลิปสั้นลง Reels ได้ทันท่วงทีตามกำหนดการงานค่ะ',
            portfolio_link: 'https://youtube.com',
            matching_score: 92,
            matched_skills: ['ถ่ายภาพ', 'ตัดต่อวิดีโอ', 'Premiere Pro', 'Social Media'],
            status: 'approved',
            created_at: new Date(Date.now() - 3600000 * 24 * 1).toISOString()
        },
        {
            id: 'd0000000-0000-0000-0000-000000000004',
            job_id: 'c0000000-0000-0000-0000-000000000004',
            student_id: 'b0000000-0000-0000-0000-000000000002',
            student_name: 'นายต่อตระกูล ดวงสาร',
            student_email: 'tortragul@mju.ac.th',
            student_faculty: 'คณะบริหารธุรกิจ',
            message: 'สนใจเรียนรู้การประยุกต์ใช้โมเดล Machine Learning ในข้อมูลภาคสนามจริง มีความรู้พื้นฐานเรื่อง Pandas, NumPy และการเขียนคำสั่ง SQL ครับ',
            portfolio_link: 'https://github.com',
            matching_score: 90,
            matched_skills: ['Python', 'Data Analysis', 'SQL'],
            status: 'pending',
            created_at: new Date(Date.now() - 3600000 * 12).toISOString()
        }
    ],
    messages: [
        {
            id: 'f0000000-0000-0000-0000-000000000001',
            job_id: 'c0000000-0000-0000-0000-000000000001',
            sender_id: 'b0000000-0000-0000-0000-000000000001',
            sender_name: 'น.ส.ชวัลรัชต์ วงษ์คำ',
            sender_role: 'student',
            receiver_id: 'a0000000-0000-0000-0000-000000000001',
            content: 'สวัสดีค่ะอาจารย์พิชิต หนูได้ส่งร่างแบบโปสเตอร์ประชาสัมพันธ์ชุดแรกให้ตรวจสอบเรียบร้อยแล้วนะคะ',
            created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
        },
        {
            id: 'f0000000-0000-0000-0000-000000000002',
            job_id: 'c0000000-0000-0000-0000-000000000001',
            sender_id: 'a0000000-0000-0000-0000-000000000001',
            sender_name: 'อาจารย์พิชิต สิทธิกัน',
            sender_role: 'instructor',
            receiver_id: 'b0000000-0000-0000-0000-000000000001',
            content: 'อาจารย์ตรวจดูแล้วครับ งานออกแบบสวยงามและโทนสีถูกต้องตามอัตลักษณ์มหาวิทยาลัยมาก ปรับขนาดหัวข้อกิจกรรมให้เด่นขึ้นอีกนิดก็ส่งพิมพ์ได้เลยครับ',
            created_at: new Date(Date.now() - 3600000 * 24 * 1).toISOString()
        },
        {
            id: 'f0000000-0000-0000-0000-000000000003',
            job_id: 'c0000000-0000-0000-0000-000000000001',
            sender_id: 'b0000000-0000-0000-0000-000000000001',
            sender_name: 'น.ส.ชวัลรัชต์ วงษ์คำ',
            sender_role: 'student',
            receiver_id: 'a0000000-0000-0000-0000-000000000001',
            content: 'แก้ไขขนาดหัวข้อเรียบร้อยแล้วค่ะอาจารย์ ขอบคุณสำหรับคำแนะนำมากๆ ค่ะ!',
            created_at: new Date(Date.now() - 3600000 * 18).toISOString()
        },
        {
            id: 'f0000000-0000-0000-0000-000000000004',
            job_id: 'c0000000-0000-0000-0000-000000000001',
            sender_id: 'a0000000-0000-0000-0000-000000000001',
            sender_name: 'อาจารย์พิชิต สิทธิกัน',
            sender_role: 'instructor',
            receiver_id: 'b0000000-0000-0000-0000-000000000001',
            content: 'ยอดเยี่ยมมากครับ โครงการเสร็จสิ้นสมบูรณ์ อาจารย์บันทึกคะแนนประเมินและรีวิวให้ในระบบเรียบร้อยแล้วนะ',
            created_at: new Date(Date.now() - 3600000 * 10).toISOString()
        }
    ],
    notifications: [],
    reviews: [
        {
            id: '90000000-0000-0000-0000-000000000001',
            application_id: 'd0000000-0000-0000-0000-000000000001',
            job_id: 'c0000000-0000-0000-0000-000000000001',
            student_id: 'b0000000-0000-0000-0000-000000000001',
            instructor_id: 'a0000000-0000-0000-0000-000000000001',
            instructor_name: 'อาจารย์พิชิต สิทธิกัน',
            job_title: 'ผู้ช่วยออกแบบสื่อดิจิทัลและ Infographic ประจำคณะบริหารธุรกิจ',
            rating: 5,
            comment: 'นักศึกษามีทักษะการออกแบบสื่อที่ยอดเยี่ยมและตรงตามโจทย์ มีความคิดสร้างสรรค์ ส่งมอบงานตรงเวลา มีความรับผิดชอบและสื่อสารประสานงานได้เป็นมืออาชีพมาก ชื่นชมครับ',
            created_at: new Date(Date.now() - 3600000 * 10).toISOString()
        }
    ]
};

// Local Storage helpers for fallback persistence
const LocalStore = {
    get(key) {
        try {
            const data = localStorage.getItem(`linku_${key}`);
            let list = data ? JSON.parse(data) : null;
            if (!list && DEFAULT_SEED_DATA[key]) {
                list = JSON.parse(JSON.stringify(DEFAULT_SEED_DATA[key]));
                localStorage.setItem(`linku_${key}`, JSON.stringify(list));
                return list;
            }
            if (key === 'profiles' && Array.isArray(list)) {
                // Ensure all default admins exist in the list
                let modified = false;
                const defaultAdmins = DEFAULT_SEED_DATA.profiles.filter(p => p.role === 'admin');
                for (const admin of defaultAdmins) {
                    const hasAdmin = list.some(p => p.email && (
                        p.email.toLowerCase() === admin.email.toLowerCase() ||
                        p.email.toLowerCase() === `${admin.email.toLowerCase()}@mju.ac.th` ||
                        p.email.toLowerCase().replace('@mju.ac.th', '') === admin.email.toLowerCase()
                    ));
                    if (!hasAdmin) {
                        list.push(admin);
                        modified = true;
                    }
                }
                if (modified) {
                    localStorage.setItem(`linku_${key}`, JSON.stringify(list));
                }
            }
            return list || [];
        } catch {
            return DEFAULT_SEED_DATA[key] || [];
        }
    },
    set(key, data) {
        localStorage.setItem(`linku_${key}`, JSON.stringify(data));
    }
};

function openAttachmentDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('linku_attachments', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('files', { keyPath: 'id' });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function saveLocalAttachment(id, file) {
    const database = await openAttachmentDatabase();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction('files', 'readwrite');
        transaction.objectStore('files').put({ id, file });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

async function loadLocalAttachment(id) {
    const database = await openAttachmentDatabase();
    return new Promise((resolve, reject) => {
        const request = database.transaction('files').objectStore('files').get(id);
        request.onsuccess = () => resolve(request.result?.file || null);
        request.onerror = () => reject(request.error);
    });
}

// Generate UUID
export function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Database API
export const DB = {
    // 1. Connection Health Check
    async testConnection() {
        const client = getSupabase();
        if (!client) {
            return {
                connected: false,
                source: 'local',
                message: 'ยังไม่ได้ตั้งค่า Supabase URL หรือ Anon Key (ใช้งานโหมด Local Storage)'
            };
        }

        try {
            // Check if we can reach the jobs or profiles table
            const { data, error } = await client.from('jobs').select('id').limit(1);
            if (error) {
                // Table might not exist yet
                if (error.code === '42P01') {
                    return {
                        connected: false,
                        source: 'supabase_no_tables',
                        message: 'เชื่อมต่อ Supabase ได้แล้ว แต่ยังไม่พบตารางข้อมูล! กรุณารัน SQL Schema ในหน้า Supabase SQL Editor'
                    };
                }
                return {
                    connected: false,
                    source: 'supabase_error',
                    message: `เกิดข้อผิดพลาดจาก Supabase: ${error.message}`
                };
            }
            return {
                connected: true,
                source: 'supabase',
                message: 'เชื่อมต่อ Supabase Cloud สำเร็จเรียบร้อย พร้อมใช้งานตารางข้อมูลจริง'
            };
        } catch (err) {
            return {
                connected: false,
                source: 'network_error',
                message: `ไม่สามารถเชื่อมต่อได้: ${err.message}`
            };
        }
    },

    // 2. Profiles (นักศึกษา / อาจารย์)
    async getProfile(id) {
        const client = getSupabase();
        if (client) {
            try {
                const { data, error } = await client.from('profiles').select('*').eq('id', id).maybeSingle();
                if (!error && data) return data;
            } catch (e) {
                console.warn('Supabase getProfile error, falling back:', e);
            }
        }
        const profiles = LocalStore.get('profiles');
        return profiles.find(p => p.id === id) || null;
    },

    async getProfileByEmail(email) {
        const clean = (email || '').trim().toLowerCase();
        if (!clean) return null;

        const client = getSupabase();
        if (client) {
            try {
                const { data, error } = await client.from('profiles').select('*')
                    .or(`email.ilike.${clean},email.ilike.${clean}@mju.ac.th`)
                    .maybeSingle();
                if (!error && data) return data;
            } catch (e) {
                console.warn('Supabase getProfileByEmail error, falling back:', e);
            }
        }
        const profiles = LocalStore.get('profiles');
        return profiles.find(p => {
            if (!p.email) return false;
            const pEmail = p.email.toLowerCase();
            return pEmail === clean ||
                   pEmail === `${clean}@mju.ac.th` ||
                   pEmail.replace('@mju.ac.th', '') === clean;
        }) || null;
    },

    async getAllProfiles(filters = {}) {
        const client = getSupabase();
        if (client) {
            try {
                let query = client.from('profiles').select('*').order('created_at', { ascending: false });
                if (filters.role) query = query.eq('role', filters.role);
                const { data, error } = await query;
                if (!error && data) return data;
            } catch (e) {
                console.warn('Supabase getAllProfiles error, falling back:', e);
            }
        }
        let list = LocalStore.get('profiles');
        if (filters.role) list = list.filter(p => p.role === filters.role);
        return list;
    },

    async deleteProfile(id) {
        const client = getSupabase();
        if (client) {
            try {
                await client.from('profiles').delete().eq('id', id);
            } catch (e) {
                console.warn('Supabase deleteProfile error:', e);
            }
        }
        const profiles = LocalStore.get('profiles').filter(p => p.id !== id);
        LocalStore.set('profiles', profiles);
        return true;
    },

    async upsertProfile(profile, { strict = false } = {}) {
        if (!profile.id) profile.id = uuidv4();
        if (!profile.created_at) profile.created_at = new Date().toISOString();
        profile.updated_at = new Date().toISOString();
        if (profile.email) profile.email = profile.email.trim().toLowerCase();

        const client = getSupabase();
        if (client) {
            try {
                const { data, error } = await client.from('profiles').upsert(profile).select().single();
                if (!error && data) {
                    // Update local cache too
                    const list = LocalStore.get('profiles').filter(p => p.id !== profile.id);
                    list.push(data);
                    LocalStore.set('profiles', list);
                    return data;
                }
                if (error) throw error;
                throw new Error('Supabase did not return the saved profile');
            } catch (e) {
                console.warn('Supabase upsertProfile error:', e);
                if (strict) throw e;
            }
        }

        // Local storage fallback
        const profiles = LocalStore.get('profiles').filter(p => p.id !== profile.id);
        profiles.push(profile);
        LocalStore.set('profiles', profiles);
        return profile;
    },

    // 3. Portfolios (ผลงานนักศึกษา)
    async getPortfolios(userId) {
        const client = getSupabase();
        if (client) {
            try {
                const { data, error } = await client.from('portfolios').select('*').eq('user_id', userId).order('created_at', { ascending: false });
                if (!error && data) return data;
            } catch (e) {
                console.warn('Supabase getPortfolios error:', e);
            }
        }
        const items = LocalStore.get('portfolios');
        return items.filter(p => p.user_id === userId);
    },

    async createPortfolio(item) {
        if (!item.id) item.id = uuidv4();
        if (!item.created_at) item.created_at = new Date().toISOString();

        const client = getSupabase();
        if (client) {
            try {
                const { data, error } = await client.from('portfolios').insert(item).select().single();
                if (!error && data) {
                    const list = LocalStore.get('portfolios');
                    list.unshift(data);
                    LocalStore.set('portfolios', list);
                    return data;
                }
            } catch (e) {
                console.warn('Supabase createPortfolio error:', e);
            }
        }

        const items = LocalStore.get('portfolios');
        items.unshift(item);
        LocalStore.set('portfolios', items);
        return item;
    },

    async updatePortfolio(id, updates, { strict = false } = {}) {
        const client = getSupabase();
        if (client) {
            try {
                let query = client.from('portfolios').update(updates).eq('id', id);
                if (updates.user_id) query = query.eq('user_id', updates.user_id);

                const { data, error } = await query.select().single();
                if (error) throw error;
                if (!data) throw new Error('Supabase did not return the updated portfolio item');
                const items = LocalStore.get('portfolios').filter(item => item.id !== id);
                items.unshift(data);
                LocalStore.set('portfolios', items);
                return data;
            } catch (error) {
                console.warn('Supabase updatePortfolio error:', error);
                if (strict) throw error;
            }
        }

        const items = LocalStore.get('portfolios').map(item =>
            item.id === id ? { ...item, ...updates } : item
        );
        LocalStore.set('portfolios', items);
        return items.find(item => item.id === id) || null;
    },

    async deletePortfolio(id) {
        const client = getSupabase();
        if (client) {
            try {
                await client.from('portfolios').delete().eq('id', id);
            } catch (e) {
                console.warn('Supabase deletePortfolio error:', e);
            }
        }
        const items = LocalStore.get('portfolios').filter(p => p.id !== id);
        LocalStore.set('portfolios', items);
        return true;
    },

    // 4. Jobs (ประกาศงาน / โครงการ)
    async getJobs(filters = {}) {
        const client = getSupabase();
        if (client) {
            try {
                let query = client.from('jobs').select('*').order('created_at', { ascending: false });
                if (filters.status && filters.status !== 'all') {
                    query = query.eq('status', filters.status);
                }
                if (filters.created_by) {
                    query = query.eq('created_by', filters.created_by);
                }
                const { data, error } = await query;
                if (!error && data) return data;
            } catch (e) {
                console.warn('Supabase getJobs error, falling back:', e);
            }
        }

        let jobs = LocalStore.get('jobs');
        if (filters.status && filters.status !== 'all') {
            jobs = jobs.filter(j => j.status === filters.status);
        }
        if (filters.created_by) {
            jobs = jobs.filter(j => j.created_by === filters.created_by);
        }
        return jobs.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    },

    async getJob(id) {
        const client = getSupabase();
        if (client) {
            try {
                const { data, error } = await client.from('jobs').select('*').eq('id', id).maybeSingle();
                if (!error && data) return data;
            } catch (e) {
                console.warn('Supabase getJob error:', e);
            }
        }
        const jobs = LocalStore.get('jobs');
        return jobs.find(j => j.id === id) || null;
    },

    async createJob(job) {
        if (!job.id) job.id = uuidv4();
        if (!job.created_at) job.created_at = new Date().toISOString();
        job.updated_at = new Date().toISOString();
        if (!job.status) job.status = 'open';

        const client = getSupabase();
        if (client) {
            try {
                const { data, error } = await client.from('jobs').insert(job).select().single();
                if (!error && data) {
                    const jobs = LocalStore.get('jobs');
                    jobs.unshift(data);
                    LocalStore.set('jobs', jobs);
                    return data;
                }
                if (error) throw error;
                throw new Error('Supabase did not return the created job');
            } catch (e) {
                console.warn('Supabase createJob exception:', e);
                throw e;
            }
        }

        const jobs = LocalStore.get('jobs');
        jobs.unshift(job);
        LocalStore.set('jobs', jobs);
        return job;
    },

    async updateJob(id, updates) {
        updates.updated_at = new Date().toISOString();
        const client = getSupabase();
        if (client) {
            try {
                const { data, error } = await client.from('jobs').update(updates).eq('id', id).select().single();
                if (!error && data) {
                    const jobs = LocalStore.get('jobs').map(j => j.id === id ? { ...j, ...data } : j);
                    LocalStore.set('jobs', jobs);
                    return data;
                }
                if (error) throw error;
                throw new Error('Supabase did not return the updated job');
            } catch (e) {
                console.warn('Supabase updateJob exception:', e);
                throw e;
            }
        }

        const jobs = LocalStore.get('jobs').map(j => j.id === id ? { ...j, ...updates } : j);
        LocalStore.set('jobs', jobs);
        return jobs.find(j => j.id === id);
    },

    async deleteJob(id) {
        const client = getSupabase();
        if (client) {
            try {
                await client.from('jobs').delete().eq('id', id);
            } catch (e) {
                console.warn('Supabase deleteJob exception:', e);
            }
        }
        const jobs = LocalStore.get('jobs').filter(j => j.id !== id);
        LocalStore.set('jobs', jobs);
        return true;
    },

    // 5. Applications (การสมัครงาน)
    async getApplications(filters = {}) {
        const client = getSupabase();
        if (client) {
            try {
                let query = client.from('applications').select('*').order('created_at', { ascending: false });
                if (filters.student_id) query = query.eq('student_id', filters.student_id);
                if (filters.job_id) query = query.eq('job_id', filters.job_id);
                if (filters.status) query = query.eq('status', filters.status);

                const { data, error } = await query;
                if (!error && data) return data;
            } catch (e) {
                console.warn('Supabase getApplications error:', e);
            }
        }

        let apps = LocalStore.get('applications');
        if (filters.student_id) apps = apps.filter(a => a.student_id === filters.student_id);
        if (filters.job_id) apps = apps.filter(a => a.job_id === filters.job_id);
        if (filters.status) apps = apps.filter(a => a.status === filters.status);
        return apps.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    },

    async createApplication(app, { strict = false } = {}) {
        if (!app.id) app.id = uuidv4();
        if (!app.created_at) app.created_at = new Date().toISOString();
        app.updated_at = new Date().toISOString();
        if (!app.status) app.status = 'pending';

        const client = getSupabase();
        if (client) {
            try {
                const { data: existing, error: lookupError } = await client.from('applications')
                    .select('id')
                    .eq('student_id', app.student_id)
                    .eq('job_id', app.job_id)
                    .limit(1);
                if (lookupError) throw lookupError;
                if (existing?.length) {
                    const duplicateError = new Error('Application already exists for this student and job');
                    duplicateError.code = '23505';
                    throw duplicateError;
                }

                const { data, error } = await client.from('applications').insert(app).select().single();
                if (!error && data) {
                    const apps = LocalStore.get('applications');
                    apps.unshift(data);
                    LocalStore.set('applications', apps);
                    return data;
                }
                if (error) throw error;
                throw new Error('Supabase did not return the created application');
            } catch (e) {
                console.warn('Supabase createApplication error:', e);
                if (strict) throw e;
            }
        }

        const apps = LocalStore.get('applications');
        if (apps.some(existing => existing.student_id === app.student_id && existing.job_id === app.job_id)) {
            const duplicateError = new Error('Application already exists for this student and job');
            duplicateError.code = '23505';
            throw duplicateError;
        }
        apps.unshift(app);
        LocalStore.set('applications', apps);
        const job = await this.getJob(app.job_id);
        if (job?.created_by) {
            this.createLocalNotification({
                user_id: job.created_by,
                type: 'new_application',
                title: 'มีนักศึกษาสมัครงานใหม่',
                body: `${app.student_name} สมัครงาน: ${job.title}`,
                related_id: app.id
            });
        }
        return app;
    },

    async uploadApplicationAttachment(file, studentId) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const client = getSupabase();
        if (client) {
            const path = `${studentId}/${uuidv4()}-${safeName}`;
            const { error } = await client.storage.from('application-attachments').upload(path, file, {
                contentType: file.type || 'application/octet-stream',
                upsert: false
            });
            if (error) throw new Error(`อัปโหลดไฟล์ไม่สำเร็จ: ${error.message}`);
            return { attachment_path: path, attachment_name: file.name, attachment_type: file.type };
        }

        const id = uuidv4();
        await saveLocalAttachment(id, file);
        return { attachment_path: `local:${id}`, attachment_name: file.name, attachment_type: file.type };
    },

    async getApplicationAttachmentUrl(path) {
        if (!path) return null;
        if (path.startsWith('local:')) {
            const file = await loadLocalAttachment(path.slice(6));
            return file ? URL.createObjectURL(file) : null;
        }

        const client = getSupabase();
        if (!client) return null;
        const { data, error } = await client.storage.from('application-attachments').createSignedUrl(path, 300);
        return error ? null : data?.signedUrl || null;
    },

    async updateApplicationStatus(id, newStatus) {
        const updates = {
            status: newStatus,
            updated_at: new Date().toISOString()
        };

        const client = getSupabase();
        if (client) {
            const { data, error } = await client.from('applications').update(updates).eq('id', id).select().single();
            if (error) throw error;
            if (!data) throw new Error('ไม่พบใบสมัครที่ต้องการอัปเดต');
            const apps = LocalStore.get('applications').map(a => a.id === id ? { ...a, ...data } : a);
            LocalStore.set('applications', apps);
            return data;
        }

        const existing = LocalStore.get('applications').find(application => application.id === id);
        if (!existing) throw new Error('ไม่พบใบสมัครที่ต้องการอัปเดต');
        const apps = LocalStore.get('applications').map(a => a.id === id ? { ...a, ...updates } : a);
        LocalStore.set('applications', apps);
        const updated = apps.find(a => a.id === id);
        if (existing.status !== newStatus) {
            const job = await this.getJob(existing.job_id);
            const statusLabels = {
                pending: 'รอพิจารณา',
                approved: 'อนุมัติ / รับเข้าทำงาน',
                in_progress: 'กำลังดำเนินงาน',
                completed: 'เสร็จสิ้นโครงการ',
                rejected: 'ไม่ผ่านการคัดเลือก'
            };
            this.createLocalNotification({
                user_id: existing.student_id,
                type: 'application_status_update',
                title: 'อาจารย์อัปเดตสถานะใบสมัคร',
                body: `อาจารย์ได้อัปเดตสถานะงาน ${job?.title || 'โครงการ'} เป็น ${statusLabels[newStatus] || newStatus} แล้ว`,
                related_id: existing.id
            });
        }
        return updated;
    },

    async deleteApplication(id) {
        const client = getSupabase();
        if (client) {
            try {
                await client.from('applications').delete().eq('id', id);
            } catch (e) {
                console.warn('Supabase deleteApplication error:', e);
            }
        }
        const apps = LocalStore.get('applications').filter(a => a.id !== id);
        LocalStore.set('applications', apps);
        return true;
    },

    // 6. Messages (แชทแบบเรียลไทม์)
    async getMessages(jobId, studentId, instructorId) {
        const client = getSupabase();
        if (client) {
            try {
                let query = client.from('messages').select('*').order('created_at', { ascending: true });
                if (jobId) query = query.eq('job_id', jobId);
                
                const { data, error } = await query;
                if (!error && data) {
                    // Filter participants if specified
                    if (studentId && instructorId) {
                        return data.filter(m => 
                            (m.sender_id === studentId && m.receiver_id === instructorId) ||
                            (m.sender_id === instructorId && m.receiver_id === studentId)
                        );
                    }
                    return data;
                }
            } catch (e) {
                console.warn('Supabase getMessages error:', e);
            }
        }

        let msgs = LocalStore.get('messages');
        if (jobId) msgs = msgs.filter(m => m.job_id === jobId);
        if (studentId && instructorId) {
            msgs = msgs.filter(m => 
                (m.sender_id === studentId && m.receiver_id === instructorId) ||
                (m.sender_id === instructorId && m.receiver_id === studentId)
            );
        }
        return msgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    },

    async markMessagesRead(jobId, receiverId, senderId) {
        const client = getSupabase();
        if (client) {
            const { error } = await client.from('messages')
                .update({ is_read: true, read_at: new Date().toISOString() })
                .eq('job_id', jobId)
                .eq('receiver_id', receiverId)
                .eq('sender_id', senderId)
                .eq('is_read', false);
            if (error) throw error;
        }

        const messages = LocalStore.get('messages').map(message =>
            message.job_id === jobId &&
            message.receiver_id === receiverId &&
            message.sender_id === senderId &&
            !message.is_read
                ? { ...message, is_read: true, read_at: new Date().toISOString() }
                : message
        );
        LocalStore.set('messages', messages);
    },

    async sendMessage(msg, { strict = false } = {}) {
        if (!msg.id) msg.id = uuidv4();
        if (!msg.created_at) msg.created_at = new Date().toISOString();
        if (msg.is_read === undefined) msg.is_read = false;

        const client = getSupabase();
        if (client) {
            try {
                const { data, error } = await client.from('messages').insert(msg).select().single();
                if (!error && data) {
                    const list = LocalStore.get('messages');
                    list.push(data);
                    LocalStore.set('messages', list);
                    return data;
                }
                if (error) throw error;
                throw new Error('Supabase did not return the saved message');
            } catch (e) {
                console.warn('Supabase sendMessage error:', e);
                if (strict) throw e;
            }
        }

        const msgs = LocalStore.get('messages');
        msgs.push(msg);
        LocalStore.set('messages', msgs);
        return msg;
    },

    async uploadChatAttachment(file, userId) {
        const allowedTypes = {
            pdf: 'application/pdf',
            doc: 'application/msword',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            zip: 'application/zip',
            png: 'image/png',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            webp: 'image/webp',
            xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            txt: 'text/plain'
        };
        const extension = file?.name?.split('.').pop()?.toLowerCase();
        if (!file || !allowedTypes[extension]) {
            throw new Error('รองรับไฟล์รูป PNG, JPG, WEBP และเอกสาร PDF, Word, Excel, PowerPoint, ZIP หรือ TXT');
        }
        if (file.size > 10 * 1024 * 1024) {
            throw new Error('ไฟล์ต้องมีขนาดไม่เกิน 10 MB');
        }
        if (!userId) {
            throw new Error('ไม่พบข้อมูลผู้ใช้สำหรับอัปโหลดไฟล์');
        }

        const client = getSupabase();
        if (!client) {
            throw new Error('ยังไม่ได้เชื่อมต่อ Supabase จึงไม่สามารถอัปโหลดไฟล์ได้');
        }

        const path = `${userId}/${uuidv4()}.${extension}`;
        const { data, error } = await client.storage
            .from('chat-attachments')
            .upload(path, file, {
                contentType: allowedTypes[extension],
                upsert: false
            });
        if (error) {
            throw new Error(`อัปโหลดไฟล์ไม่สำเร็จ: ${error.message}`);
        }

        const { data: publicUrlData } = client.storage
            .from('chat-attachments')
            .getPublicUrl(data.path);
        if (!publicUrlData?.publicUrl) {
            throw new Error('อัปโหลดไฟล์สำเร็จ แต่ไม่สามารถสร้างลิงก์ดาวน์โหลดได้');
        }

        return {
            url: publicUrlData.publicUrl,
            fileName: file.name,
            fileSize: file.size,
            contentType: allowedTypes[extension]
        };
    },

    subscribeToMessages(onNewMessage) {
        const client = getSupabase();
        if (client) {
            try {
                if (realtimeChannel) {
                    client.removeChannel(realtimeChannel);
                }
                realtimeChannel = client.channel('public:messages')
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
                        console.log('⚡ Realtime message received from Supabase:', payload.new);
                        if (onNewMessage) onNewMessage(payload.new);
                    })
                    .subscribe();
                return () => {
                    if (realtimeChannel) client.removeChannel(realtimeChannel);
                };
            } catch (e) {
                console.warn('Realtime subscription error:', e);
            }
        }
        return () => {};
    },

    subscribeToApplications(onNewApplication) {
        const client = getSupabase();
        if (!client) return () => {};
        try {
            if (applicationsChannel) client.removeChannel(applicationsChannel);
            applicationsChannel = client.channel('public:applications')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, payload => {
                    if (payload.eventType === 'DELETE') return;
                    if (onNewApplication) onNewApplication(payload.new);
                })
                .subscribe();
            return () => {
                if (applicationsChannel) client.removeChannel(applicationsChannel);
            };
        } catch (e) {
            console.warn('Application realtime subscription error:', e);
            return () => {};
        }
    },

    async getNotifications(userId) {
        const client = getSupabase();
        if (client) {
            const { data, error } = await client.from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50);
            if (error) throw error;
            return data || [];
        }
        return LocalStore.get('notifications')
            .filter(notification => notification.user_id === userId)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 50);
    },

    async markNotificationRead(id) {
        const client = getSupabase();
        if (client) {
            const { error } = await client.from('notifications')
                .update({ is_read: true })
                .eq('id', id);
            if (error) throw error;
        }
        LocalStore.set('notifications', LocalStore.get('notifications').map(notification =>
            notification.id === id ? { ...notification, is_read: true } : notification
        ));
    },

    createLocalNotification(notification) {
        const notifications = LocalStore.get('notifications');
        notifications.unshift({
            id: uuidv4(),
            ...notification,
            is_read: false,
            created_at: new Date().toISOString()
        });
        LocalStore.set('notifications', notifications);
    },

    subscribeToNotifications(userId, onNewNotification) {
        const client = getSupabase();
        if (!client) return () => {};
        try {
            if (notificationsChannel) client.removeChannel(notificationsChannel);
            notificationsChannel = client.channel(`public:notifications:${userId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                }, payload => onNewNotification?.(payload.new))
                .subscribe();
            return () => {
                if (notificationsChannel) client.removeChannel(notificationsChannel);
            };
        } catch (error) {
            console.warn('Notification realtime subscription error:', error);
            return () => {};
        }
    },

    // 7. Reviews (รีวิวและให้คะแนน)
    async getReviews(studentId) {
        const client = getSupabase();
        if (client) {
            try {
                const { data, error } = await client.from('reviews').select('*').eq('student_id', studentId).order('created_at', { ascending: false });
                if (!error && data) return data;
            } catch (e) {
                console.warn('Supabase getReviews error:', e);
            }
        }
        const reviews = LocalStore.get('reviews');
        return reviews.filter(r => r.student_id === studentId);
    },

    async getAllReviews() {
        const client = getSupabase();
        if (client) {
            try {
                const { data, error } = await client.from('reviews').select('*').order('created_at', { ascending: false });
                if (!error && data) return data;
            } catch (e) {
                console.warn('Supabase getAllReviews error:', e);
            }
        }
        return LocalStore.get('reviews');
    },

    async createReview(review) {
        if (!review.id) review.id = uuidv4();
        if (!review.created_at) review.created_at = new Date().toISOString();

        const client = getSupabase();
        if (client) {
            try {
                const { data, error } = await client.from('reviews').insert(review).select().single();
                if (!error && data) {
                    const list = LocalStore.get('reviews');
                    list.unshift(data);
                    LocalStore.set('reviews', list);
                    return data;
                }
            } catch (e) {
                console.warn('Supabase createReview error:', e);
            }
        }

        const reviews = LocalStore.get('reviews');
        reviews.unshift(review);
        LocalStore.set('reviews', reviews);
        return review;
    },

    // 8. Dashboard Data & Statistics
    async getDashboardStats() {
        const jobs = await this.getJobs();
        const applications = await this.getApplications();
        const reviews = await this.getAllReviews();

        const activeJobs = jobs.filter(j => j.status === 'open').length;
        const closedJobs = jobs.filter(j => j.status === 'closed').length;
        const totalApplicants = applications.length;
        const approvedCount = applications.filter(a => a.status === 'approved').length;
        const inProgressCount = applications.filter(a => a.status === 'in_progress').length;
        const completedCount = applications.filter(a => a.status === 'completed').length;
        const pendingCount = applications.filter(a => a.status === 'pending').length;

        // Calculate skill demand from jobs
        const skillCounts = {};
        jobs.forEach(j => {
            const skills = Array.isArray(j.required_skills) ? j.required_skills : [];
            skills.forEach(s => {
                const key = s.trim();
                if (key) skillCounts[key] = (skillCounts[key] || 0) + 1;
            });
        });

        const topSkills = Object.entries(skillCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([name, count]) => ({ name, count }));

        // Average review rating
        const avgRating = reviews.length > 0
            ? (reviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / reviews.length).toFixed(1)
            : '5.0';

        return {
            totalJobs: jobs.length,
            activeJobs,
            closedJobs,
            totalApplicants,
            pendingCount,
            approvedCount,
            inProgressCount,
            completedCount,
            topSkills,
            totalReviews: reviews.length,
            avgRating
        };
    },

    // 9. Admin Comprehensive Dashboard & System-wide Analytics
    async getAdminDashboardStats() {
        const jobs = await this.getJobs();
        const applications = await this.getApplications();
        const profiles = await this.getAllProfiles();
        const reviews = await this.getAllReviews();

        const students = profiles.filter(p => p.role === 'student');
        const instructors = profiles.filter(p => p.role === 'instructor');
        const admins = profiles.filter(p => p.role === 'admin');

        const totalApplications = applications.length;
        const uniqueApplicants = new Set(applications.map(a => a.student_id)).size;

        const pendingCount = applications.filter(a => a.status === 'pending').length;
        const approvedCount = applications.filter(a => a.status === 'approved').length;
        const inProgressCount = applications.filter(a => a.status === 'in_progress').length;
        const completedCount = applications.filter(a => a.status === 'completed').length;
        const rejectedCount = applications.filter(a => a.status === 'rejected').length;

        // Categorize jobs: What types are most jobs in the system?
        const categoryMap = {
            'สื่อดิจิทัลและกราฟิกดีไซน์': { count: 0, icon: '🎨', color: '#2563EB', bg: '#EFF6FF', desc: 'ออกแบบสื่อ Infographic, โปสเตอร์, UI/Canva/Figma' },
            'พัฒนาเว็บและเทคโนโลยีสารสนเทศ': { count: 0, icon: '💻', color: '#0284C7', bg: '#F0F9FF', desc: 'Frontend, React, HTML/CSS, Web Application, ระบบงาน' },
            'ผลิตสื่อ ภาพนิ่งและตัดต่อวิดีโอ': { count: 0, icon: '🎬', color: '#7C3AED', bg: '#F5F3FF', desc: 'ถ่ายภาพกิจกรรม, วิดีโอสั้น, Premiere Pro, TikTok' },
            'วิจัยและการวิเคราะห์ข้อมูล': { count: 0, icon: '📊', color: '#059669', bg: '#ECFDF5', desc: 'Python, Data Analytics, Machine Learning, สถิติเกษตร' },
            'ประสานงานและกิจกรรมอีเวนต์': { count: 0, icon: '🤝', color: '#D97706', bg: '#FFFBEB', desc: 'พิธีกร MC, สื่อสารองค์กร, สัมมนา, ประสานงานทั่วไป' }
        };

        jobs.forEach(job => {
            const text = `${job.title} ${job.description} ${(job.required_skills || []).join(' ')}`.toLowerCase();
            if (text.includes('react') || text.includes('web') || text.includes('frontend') || text.includes('พัฒนาระบบ') || text.includes('javascript') || text.includes('html')) {
                categoryMap['พัฒนาเว็บและเทคโนโลยีสารสนเทศ'].count++;
            } else if (text.includes('ตัดต่อ') || text.includes('ถ่ายภาพ') || text.includes('วิดีโอ') || text.includes('premiere') || text.includes('video') || text.includes('ช่างภาพ')) {
                categoryMap['ผลิตสื่อ ภาพนิ่งและตัดต่อวิดีโอ'].count++;
            } else if (text.includes('วิจัย') || text.includes('python') || text.includes('data') || text.includes('ข้อมูล') || text.includes('ai') || text.includes('machine learning')) {
                categoryMap['วิจัยและการวิเคราะห์ข้อมูล'].count++;
            } else if (text.includes('ประสานงาน') || text.includes('mc') || text.includes('พิธีกร') || text.includes('สัมมนา') || text.includes('เอกสาร') || text.includes('excel')) {
                categoryMap['ประสานงานและกิจกรรมอีเวนต์'].count++;
            } else {
                categoryMap['สื่อดิจิทัลและกราฟิกดีไซน์'].count++;
            }
        });

        const jobCategories = Object.entries(categoryMap)
            .map(([name, data]) => ({
                name,
                count: data.count,
                icon: data.icon,
                color: data.color,
                bg: data.bg,
                desc: data.desc,
                percentage: jobs.length > 0 ? Math.round((data.count / jobs.length) * 100) : 0
            }))
            .sort((a, b) => b.count - a.count);

        // Analyze Student Skills (ความถนัดของนักศึกษา)
        const skillCounts = {};
        students.forEach(student => {
            const skills = Array.isArray(student.skills) ? student.skills : [];
            skills.forEach(s => {
                const clean = s.trim();
                if (clean) skillCounts[clean] = (skillCounts[clean] || 0) + 1;
            });
        });

        const topStudentSkills = Object.entries(skillCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({
                name,
                count,
                percentage: students.length > 0 ? Math.round((count / students.length) * 100) : 0
            }));

        // Analyze Student Interests (ความสนใจของนักศึกษา)
        const interestCounts = {};
        students.forEach(student => {
            if (student.interests) {
                const parts = student.interests.split(/[,/]+/).map(p => p.trim()).filter(Boolean);
                parts.forEach(interest => {
                    interestCounts[interest] = (interestCounts[interest] || 0) + 1;
                });
            }
        });

        const topStudentInterests = Object.entries(interestCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({
                name,
                count
            }));

        return {
            totalApplications,
            uniqueApplicants,
            totalStudents: students.length,
            totalInstructors: instructors.length,
            totalAdmins: admins.length,
            totalJobs: jobs.length,
            activeJobs: jobs.filter(j => j.status === 'open').length,
            closedJobs: jobs.filter(j => j.status === 'closed').length,
            pendingCount,
            approvedCount,
            inProgressCount,
            completedCount,
            rejectedCount,
            jobCategories,
            topStudentSkills,
            topStudentInterests,
            totalReviews: reviews.length,
            avgRating: reviews.length > 0
                ? (reviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / reviews.length).toFixed(1)
                : '5.0',
            students,
            instructors,
            admins
        };
    }
};
