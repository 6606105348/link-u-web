// Link U (ลิงค์ ยู) - Main Application Controller
// Maejo University Campus Job Matching Platform
import { DB, uuidv4 } from './db.js';
import { MatchingEngine } from './matching.js';
import { SupabaseConfig } from './supabase-config.js';

// Application State
const AppState = {
    currentUser: null,
    activeTab: 'jobs',
    jobs: [],
    applications: [],
    reviews: [],
    activeChat: null,
    notificationsOpen: false,
        applicantStatusFilter: 'all',
    searchQuery: '',
    selectedTag: '',
    supabaseStatus: { connected: false, message: 'กำลังตรวจสอบการเชื่อมต่อ...' }
};
let selectedApplicationFile = null;
let registerAvatarDataUrl = '';
let quickAvatarDataUrl = '';
let modalAvatarDataUrl = '';
let deadlinePickerDate = new Date();
let notificationsSubscriptionUserId = null;
const THAI_MONTH_NAMES = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const THAI_WEEKDAY_NAMES = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const CHAT_MESSAGE_PREFIX = 'linku-chat:';

// Default Sample Users (for fast testing if no user in DB yet)
const INITIAL_DEMO_USERS = [
    {
        id: 'user-inst-01',
        email: 'pichit@mju.ac.th',
        full_name: 'อ.พิชิต สิทธิกัน',
        role: 'instructor',
        faculty: 'คณะบริหารธุรกิจ',
        department: 'สาขาวิชานวัตกรรมธุรกิจดิจิทัล',
        year_level: 'อาจารย์ที่ปรึกษาโครงงาน',
        phone: '053-873-000',
        bio: 'อาจารย์ประจำสาขาวิชานวัตกรรมธุรกิจดิจิทัล มหาวิทยาลัยแม่โจ้ มุ่งเน้นการส่งเสริมทักษะเทคโนโลยีและการประยุกต์ใช้จริง',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        skills: ['Digital Innovation', 'Project Management', 'Information Systems'],
        interests: 'AI, Web Development, Experiential Learning'
    },
    {
        id: 'user-stud-01',
        email: 'chawanrat@mju.ac.th',
        full_name: 'น.ส.ชวัลรัชต์ วงษ์คำ',
        role: 'student',
        faculty: 'คณะบริหารธุรกิจ',
        department: 'สาขาวิชานวัตกรรมธุรกิจดิจิทัล',
        year_level: 'นักศึกษาชั้นปีที่ 3',
        phone: '081-234-5678',
        bio: 'นักศึกษาสาขานวัตกรรมธุรกิจดิจิทัล มีความสนใจด้าน UX/UI Design, การพัฒนาเว็บ และการผลิตสื่อดิจิทัล',
        avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
        skills: ['Canva', 'Graphic Design', 'Figma', 'React', 'HTML/CSS', 'ถ่ายภาพ'],
        interests: 'UI/UX Design, Web Application, Media Production'
    }
];

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Link U Application Initializing...');
    await initAuth();
    await checkSupabaseHealth();
    bindUIEvents();
    await loadInitialData();
    renderHeader();
    renderCurrentView();
    // Start polling for notifications every 30 seconds
    updateNotificationBadges();
    setInterval(updateNotificationBadges, 30000);

    // Listen to real-time messages
    DB.subscribeToMessages(newMsg => {
        handleIncomingRealtimeMessage(newMsg);
        updateNotificationBadges();
    });
    DB.subscribeToApplications(async application => {
        if (application.student_id === AppState.currentUser?.id) {
            const alreadyLoaded = AppState.applications.some(item => item.id === application.id);
            if (!alreadyLoaded) AppState.applications.push(application);
            updateApplyButtonState(application.job_id, 'applied');
        }
        updateNotificationBadges();
    });
});

// 1. Authentication & Session Initialization
async function initAuth() {
    const savedUserId = localStorage.getItem('linku_active_user_id');
    if (savedUserId) {
        AppState.currentUser = await DB.getProfile(savedUserId);
    }

    // If still no user, seed initial users to DB if empty and log in as student by default (if not previously logged out)
    if (!AppState.currentUser) {
        for (const u of INITIAL_DEMO_USERS) {
            await DB.upsertProfile(u);
        }
        const hasLoggedOut = localStorage.getItem('linku_logged_out');
        if (!hasLoggedOut) {
            AppState.currentUser = INITIAL_DEMO_USERS[1]; // Start as student
            localStorage.setItem('linku_active_user_id', AppState.currentUser.id);
        }
    }
}

// 2. Supabase Health Check
async function checkSupabaseHealth() {
    AppState.supabaseStatus = await DB.testConnection();
    updateSupabaseBadge();
}

function updateSupabaseBadge() {
    const badge = document.getElementById('supabaseStatusBadge');
    if (!badge) return;

    if (AppState.supabaseStatus.connected) {
        badge.className = 'supabase-badge connected';
        badge.innerHTML = `<span class="dot"></span> <span>Supabase เชื่อมต่อแล้ว</span>`;
        badge.title = AppState.supabaseStatus.message;
    } else {
        badge.className = 'supabase-badge';
        badge.innerHTML = `<span class="dot"></span> <span>⚙️ ตั้งค่า Supabase</span>`;
        badge.title = AppState.supabaseStatus.message;
    }
}

// 3. Load Data
async function loadInitialData() {
    AppState.jobs = await DB.getJobs();
    AppState.applications = AppState.currentUser?.role === 'student'
        ? await DB.getApplications({ student_id: AppState.currentUser.id })
        : await DB.getApplications();
    if (AppState.currentUser) {
        AppState.reviews = await DB.getReviews(AppState.currentUser.id);
    }
}

// 4. Bind Events
function bindUIEvents() {
    // Navigation Tabs
    document.querySelectorAll('[data-nav-target]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('data-nav-target');
            navigateTo(target);
        });
    });

    // Profile Click on Top Right: "เมื่อกดที่ชื่อด้านบนขวา จะเข้าหน้าโปรไฟล์ของตนเองที่เข้าสู่ระบบไว้"
    const userBtn = document.getElementById('userProfileNavBtn');
    if (userBtn) {
        userBtn.addEventListener('click', () => {
            navigateTo('profile');
        });
    }

    const notificationToggle = document.getElementById('notificationToggle');
    notificationToggle?.addEventListener('click', async () => {
        AppState.notificationsOpen = !AppState.notificationsOpen;
        notificationToggle.setAttribute('aria-expanded', String(AppState.notificationsOpen));
        await renderNotificationMenu();
    });
    document.addEventListener('click', event => {
        const notificationWrap = document.getElementById('notificationMenuWrap');
        if (AppState.notificationsOpen && notificationWrap && !notificationWrap.contains(event.target)) {
            AppState.notificationsOpen = false;
            const popover = document.getElementById('notificationPopover');
            if (popover) popover.hidden = true;
            notificationToggle?.setAttribute('aria-expanded', 'false');
        }
        const attachmentWrap = document.querySelector('.chat-attachment-menu');
        if (attachmentWrap && !attachmentWrap.contains(event.target)) closeChatAttachmentMenu();
    });
    document.addEventListener('click', event => {
        const toggle = event.target.closest('#chatAttachmentToggle');
        if (!toggle) return;
        const popover = document.getElementById('chatAttachmentPopover');
        if (!popover) return;
        popover.hidden = !popover.hidden;
        toggle.setAttribute('aria-expanded', String(!popover.hidden));
    });

    // Role Switcher / Auth Trigger
    const roleSwitchBtn = document.getElementById('switchRoleBtn');
    if (roleSwitchBtn) {
        roleSwitchBtn.addEventListener('click', toggleUserRole);
    }

    // Supabase Status Click -> Open Config Modal
    const supabaseBadge = document.getElementById('supabaseStatusBadge');
    if (supabaseBadge) {
        supabaseBadge.addEventListener('click', () => openModal('supabaseConfigModal'));
    }

    // Search and Filters
    const searchInput = document.getElementById('jobSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            AppState.searchQuery = e.target.value.toLowerCase();
            renderJobsFeed();
        });
    }

    // Quick tag chips
    document.querySelectorAll('.tag-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const skill = chip.getAttribute('data-skill');
            if (AppState.selectedTag === skill) {
                AppState.selectedTag = '';
                chip.classList.remove('active');
            } else {
                document.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('active'));
                AppState.selectedTag = skill;
                chip.classList.add('active');
            }
            renderJobsFeed();
        });
    });

    // Post Job Button
    const postJobBtn = document.getElementById('postJobHeaderBtn');
    if (postJobBtn) {
        postJobBtn.addEventListener('click', () => {
            if (AppState.currentUser?.role !== 'instructor' && AppState.currentUser?.role !== 'admin') {
                showToast('เฉพาะอาจารย์หรือผู้ดูแลระบบเท่านั้นที่สามารถประกาศงานได้', 'error');
                return;
            }
            openJobEditorModal();
        });
    }

    // Form Submissions
    setupFormListeners();
    initHelpFaq();
}

// 5. Navigation Router
export function navigateTo(tabName, preserveApplicantFilter = false) {
    if (tabName !== 'jobs' && !AppState.currentUser) {
        showToast('กรุณาเข้าสู่ระบบก่อนใช้งานเมนูนี้', 'info');
        openAuthModal();
        return;
    }
    if (tabName === 'manage-applicants' && !preserveApplicantFilter) {
        AppState.applicantStatusFilter = 'all';
    }
    AppState.activeTab = tabName;
    if (tabName === 'chat' && AppState.currentUser) {
        localStorage.setItem(`linku_chat_visited_${AppState.currentUser.id}`, String(Date.now()));
    }
    if (tabName === 'manage-applicants' && AppState.currentUser) {
        localStorage.setItem(`linku_applicants_visited_${AppState.currentUser.id}`, String(Date.now()));
    }
    updateNotificationBadges();

    // Update active class on nav links
    document.querySelectorAll('[data-nav-target]').forEach(link => {
        if (link.getAttribute('data-nav-target') === tabName) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    renderCurrentView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function navigateToApplicants(status = 'all') {
    const allowedStatuses = ['all', 'pending', 'approved', 'in_progress', 'completed', 'rejected'];
    AppState.applicantStatusFilter = allowedStatuses.includes(status) ? status : 'all';
    navigateTo('manage-applicants', true);
}

// 6. Header Rendering
function renderHeader() {
    const user = AppState.currentUser;
    const userMenuBtn = document.getElementById('userProfileNavBtn');
    const roleBadge = document.getElementById('userRoleDisplay');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userAvatarDisplay = document.getElementById('userAvatarDisplay');
    const postJobBtn = document.getElementById('postJobHeaderBtn');
    const authModalBtn = document.getElementById('authModalBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const authNavs = document.querySelectorAll('.nav-auth-only');
    const adminNavs = document.querySelectorAll('.nav-admin-only');
    const instructorNavs = document.querySelectorAll('.nav-instructor-only');
    const studentNavs = document.querySelectorAll('.nav-student-only');
    const chatNavs = document.querySelectorAll('.nav-chat-only');

    if (!user) {
        if (userMenuBtn) userMenuBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (authModalBtn) authModalBtn.style.display = 'inline-flex';
        if (postJobBtn) postJobBtn.style.display = 'none';
        const notificationMenu = document.getElementById('notificationMenuWrap');
        if (notificationMenu) notificationMenu.style.display = 'none';

        // Hide navigation items for guest users
        authNavs.forEach(el => el.style.display = 'none');
        adminNavs.forEach(el => el.style.display = 'none');
        instructorNavs.forEach(el => el.style.display = 'none');
        studentNavs.forEach(el => el.style.display = 'none');
        chatNavs.forEach(el => el.style.display = 'none');
        notificationsSubscriptionUserId = null;
        return;
    }
    if (notificationsSubscriptionUserId !== user.id) {
        notificationsSubscriptionUserId = user.id;
        DB.subscribeToNotifications(user.id, notification => {
            if (notification.user_id !== AppState.currentUser?.id) return;
            showToast(`${notification.title}: ${notification.body}`, 'info');
            updateNotificationBadges();
            if (AppState.notificationsOpen) renderNotificationMenu();
        });
    }

    if (userMenuBtn) userMenuBtn.style.display = 'flex';
    const notificationMenu = document.getElementById('notificationMenuWrap');
    if (notificationMenu) notificationMenu.style.display = user.role === 'instructor' ? 'block' : 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    if (authModalBtn) authModalBtn.style.display = 'none';

    // Show auth-only navigation items when logged in
    authNavs.forEach(el => el.style.display = 'flex');

    if (userNameDisplay) userNameDisplay.textContent = user.full_name;
    if (userAvatarDisplay) {
        if (user.avatar_url) {
            userAvatarDisplay.innerHTML = `<img src="${user.avatar_url}" alt="${user.full_name}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        } else {
            userAvatarDisplay.textContent = user.full_name.charAt(0);
        }
    }

    // Role-based navigation visibility & role badge
    if (user.role === 'admin') {
        adminNavs.forEach(el => el.style.display = 'flex');
        instructorNavs.forEach(el => el.style.display = 'none');
        studentNavs.forEach(el => el.style.display = 'none');
        chatNavs.forEach(el => el.style.display = 'none'); // ซ่อนแชทสำหรับ admin
        if (postJobBtn) postJobBtn.style.display = 'inline-flex';
        if (roleBadge) {
            roleBadge.textContent = '🛡️ ผู้ดูแลระบบ (Admin)';
            roleBadge.className = 'user-role-badge admin';
        }
    } else if (user.role === 'instructor') {
        adminNavs.forEach(el => el.style.display = 'none');
        instructorNavs.forEach(el => el.style.display = 'flex');
        studentNavs.forEach(el => el.style.display = 'none');
        chatNavs.forEach(el => el.style.display = 'flex'); // แสดงแชทสำหรับอาจารย์
        if (postJobBtn) postJobBtn.style.display = 'inline-flex';
        if (roleBadge) {
            roleBadge.textContent = 'อาจารย์ / บุคลากร';
            roleBadge.className = 'user-role-badge';
        }
    } else {
        adminNavs.forEach(el => el.style.display = 'none');
        instructorNavs.forEach(el => el.style.display = 'none');
        studentNavs.forEach(el => el.style.display = 'flex');
        chatNavs.forEach(el => el.style.display = 'flex'); // แสดงแชทสำหรับนักศึกษา
        if (postJobBtn) postJobBtn.style.display = 'none';
        if (roleBadge) {
            roleBadge.textContent = 'นักศึกษา';
            roleBadge.className = 'user-role-badge';
        }
    }
}

// =========================================================================
// NOTIFICATION BADGE SYSTEM (แจ้งเตือนแบบวงกลมสีแดง เหมือนแอปมือถือ)
// =========================================================================
async function updateNotificationBadges() {
    if (!AppState.currentUser) return;
    const user = AppState.currentUser;

    // --- Chat Badge: นับข้อความที่ยังไม่ได้อ่าน ---
    try {
        const allApps = await DB.getApplications();
        const allJobs = await DB.getJobs();
        const relevantApps = allApps.filter(a =>
            a.student_id === user.id ||
            (allJobs.find(j => j.id === a.job_id)?.created_by === user.id)
        );
        let unreadChat = 0;
        for (const app of relevantApps) {
            const job = allJobs.find(j => j.id === app.job_id);
            if (!job) continue;
            const otherUserId = user.role === 'student' ? job.created_by : app.student_id;
            const msgs = await DB.getMessages(app.job_id, user.id, otherUserId);
            unreadChat += msgs.filter(m => m.receiver_id === user.id && !m.is_read).length;
        }
        const chatBadge = document.getElementById('chatBadge');
        if (chatBadge) {
            if (unreadChat > 0) {
                chatBadge.textContent = unreadChat > 99 ? '99+' : String(unreadChat);
                chatBadge.style.display = 'inline-flex';
            } else {
                chatBadge.style.display = 'none';
            }
        }
    } catch (error) {
        console.warn('Unable to update unread chat badge:', error);
    }

    // --- Applicants Badge: สำหรับอาจารย์ นับใบสมัครใหม่ที่ยังไม่ได้ดู ---
    if (user.role === 'instructor') {
        try {
            const myJobs = await DB.getJobs({ created_by: user.id });
            const allApps2 = await DB.getApplications();
            const jobIds = myJobs.map(j => j.id);
            const lastApplicantVisit = parseInt(localStorage.getItem(`linku_applicants_visited_${user.id}`) || '0', 10);
            const newApplicants = allApps2.filter(a =>
                jobIds.includes(a.job_id) &&
                a.status === 'pending' &&
                new Date(a.created_at).getTime() > lastApplicantVisit
            ).length;
            const appBadge = document.getElementById('applicantsBadge');
            if (appBadge) {
                if (newApplicants > 0) {
                    appBadge.textContent = newApplicants > 99 ? '99+' : String(newApplicants);
                    appBadge.style.display = 'inline-flex';
                } else {
                    appBadge.style.display = 'none';
                }
            }
        } catch (error) {
            console.warn('Unable to update applicants badge:', error);
        }

        try {
            const notifications = await DB.getNotifications(user.id);
            const unreadNotifications = notifications.filter(notification => !notification.is_read).length;
            const notificationBadge = document.getElementById('notificationBadge');
            if (notificationBadge) {
                notificationBadge.textContent = unreadNotifications > 99 ? '99+' : String(unreadNotifications);
                notificationBadge.style.display = unreadNotifications ? 'inline-flex' : 'none';
            }
        } catch (error) {
            console.warn('Unable to update notification badge:', error);
        }
    }
}

async function renderNotificationMenu() {
    const popover = document.getElementById('notificationPopover');
    if (!popover || !AppState.currentUser) return;
    popover.hidden = !AppState.notificationsOpen;
    if (!AppState.notificationsOpen) return;

    try {
        const notifications = await DB.getNotifications(AppState.currentUser.id);
        popover.innerHTML = `
            <div class="notification-popover-header">
                <strong>การแจ้งเตือน</strong>
                <button type="button" onclick="window.linkUApp.markAllNotificationsRead()">อ่านทั้งหมด</button>
            </div>
            <div class="notification-list">
                ${notifications.length ? notifications.map(notification => `
                    <button type="button" class="notification-item ${notification.is_read ? '' : 'unread'}"
                        onclick="window.linkUApp.openNotification('${escapeHTML(notification.id)}')">
                        <span class="notification-item-icon">📄</span>
                        <span><strong>${escapeHTML(notification.title)}</strong>
                            <small>${escapeHTML(notification.body)}</small>
                            <small>${formatTime(notification.created_at)}</small></span>
                    </button>
                `).join('') : '<div class="notification-empty">ยังไม่มีการแจ้งเตือน</div>'}
            </div>
        `;
    } catch (error) {
        console.error('Unable to load notifications:', error);
        popover.innerHTML = '<div class="notification-empty">โหลดการแจ้งเตือนไม่สำเร็จ</div>';
    }
}

export async function openNotification(id) {
    try {
        await DB.markNotificationRead(id);
        AppState.notificationsOpen = false;
        const toggle = document.getElementById('notificationToggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
        await updateNotificationBadges();
        if (AppState.currentUser?.role === 'instructor') navigateToApplicants('pending');
    } catch (error) {
        showToast(`อัปเดตการแจ้งเตือนไม่สำเร็จ: ${error.message}`, 'error');
    }
}

export async function markAllNotificationsRead() {
    try {
        const notifications = await DB.getNotifications(AppState.currentUser.id);
        await Promise.all(notifications.filter(item => !item.is_read).map(item => DB.markNotificationRead(item.id)));
        await updateNotificationBadges();
        await renderNotificationMenu();
    } catch (error) {
        showToast(`อัปเดตการแจ้งเตือนไม่สำเร็จ: ${error.message}`, 'error');
    }
}

// Quick switch between Student, Instructor, and Admin to effortlessly test all features
async function toggleUserRole() {
    const currentRole = AppState.currentUser?.role || 'student';
    let targetEmail = 'pichit@mju.ac.th';
    if (currentRole === 'student') targetEmail = 'pichit@mju.ac.th';
    else if (currentRole === 'instructor') targetEmail = 'admin1';
    else targetEmail = 'chawanrat@mju.ac.th';

    let targetUser = await DB.getProfileByEmail(targetEmail);
    if (!targetUser) {
        targetUser = INITIAL_DEMO_USERS[0];
        await DB.upsertProfile(targetUser);
    }

    AppState.currentUser = targetUser;
    localStorage.setItem('linku_active_user_id', targetUser.id);
    const label = targetUser.role === 'admin' ? 'ผู้ดูแลระบบ (' + targetUser.full_name + ')' :
                  targetUser.role === 'instructor' ? 'อาจารย์ / บุคลากร (' + targetUser.full_name + ')' :
                  'นักศึกษา (' + targetUser.full_name + ')';
    showToast(`สลับบทบาทเป็น: ${label}`, 'info');
    renderHeader();
    updateNotificationBadges();
    if (targetUser.role === 'admin') {
        navigateTo('admin-dashboard');
    } else {
        renderCurrentView();
    }
}

// 7. Render Views
async function renderCurrentView() {
    const viewContainer = document.getElementById('viewContainer');
    const heroSection = document.getElementById('heroSearchSection');

    // Show/hide Hero only on 'jobs' or 'matching' tab
    if (AppState.activeTab === 'jobs' || AppState.activeTab === 'matching') {
        if (heroSection) heroSection.style.display = 'block';
    } else {
        if (heroSection) heroSection.style.display = 'none';
    }

    switch (AppState.activeTab) {
        case 'jobs':
            await renderJobsFeed();
            break;
        case 'matching':
            await renderMatchingFeed();
            break;
        case 'my-applications':
            await renderMyApplicationsView();
            break;
        case 'manage-jobs':
            await renderManageJobsView();
            break;
        case 'manage-applicants':
            await renderManageApplicantsView();
            break;
        case 'chat':
            await renderChatView();
            break;
        case 'profile':
            await renderProfileView();
            break;
        case 'dashboard':
            await renderDashboardView();
            break;
        case 'admin-dashboard':
            await renderAdminDashboardView();
            break;
        case 'admin-manage-jobs':
            await renderAdminManageJobsView();
            break;
        case 'admin-manage-users':
            await renderAdminManageUsersView();
            break;
        case 'admin-manage-applications':
            await renderAdminManageApplicationsView();
            break;
        default:
            await renderJobsFeed();
    }
}

// =========================================================================
// VIEW: 1. Jobs Feed (intern.th style)
// =========================================================================
async function renderJobsFeed() {
    const container = document.getElementById('viewContainer');
    AppState.jobs = await DB.getJobs();

    let filteredJobs = AppState.jobs.filter(job => {
        if (job.status !== 'open') return false; // Default feed shows open jobs

        const matchesSearch = !AppState.searchQuery ||
            job.title.toLowerCase().includes(AppState.searchQuery) ||
            job.department.toLowerCase().includes(AppState.searchQuery) ||
            (job.description || '').toLowerCase().includes(AppState.searchQuery) ||
            (Array.isArray(job.required_skills) && job.required_skills.some(s => s.toLowerCase().includes(AppState.searchQuery)));

        const matchesTag = !AppState.selectedTag ||
            (Array.isArray(job.required_skills) && job.required_skills.some(s => MatchingEngine.isSkillMatch(s, AppState.selectedTag)));

        return matchesSearch && matchesTag;
    });

    container.innerHTML = `
        <div class="section-header">
            <div>
                <h1 class="section-title">
                    <span>📌 ประกาศงานและโครงการล่าสุด</span>
                    <span class="section-counter">(${filteredJobs.length} ตำแหน่ง)</span>
                </h1>
                <p style="font-size:0.88rem; color:var(--text-secondary); margin-top:4px;">
                    งานภายในมหาวิทยาลัยแม่โจ้สำหรับนักศึกษาที่ต้องการฝึกประสบการณ์จริง
                </p>
            </div>
            ${AppState.currentUser?.role === 'instructor' ? `
                <button class="btn btn-primary" onclick="window.linkUApp.openJobEditorModal()">
                    <span>➕ ประกาศงานใหม่</span>
                </button>
            ` : ''}
        </div>

        ${filteredJobs.length === 0 ? `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3 class="empty-title">ไม่พบประกาศงานที่ตรงกับเงื่อนไข</h3>
                <p class="empty-text">ลองปรับเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่นดูสิครับ</p>
                ${AppState.currentUser?.role === 'instructor' ? `
                    <button class="btn btn-primary" onclick="window.linkUApp.openJobEditorModal()">
                        <span>➕ โพสต์งานใหม่ทันที</span>
                    </button>
                ` : ''}
            </div>
        ` : `
            <div class="jobs-grid">
                ${filteredJobs.map(job => renderJobCardHTML(job)).join('')}
            </div>
        `}
    `;
}

// Generate Single Job Card HTML
function renderJobCardHTML(job, isMatchHighlight = false) {
    const isStudent = AppState.currentUser?.role === 'student';
    const match = isStudent ? MatchingEngine.calculateMatch(AppState.currentUser, job) : null;
    const isAuthor = AppState.currentUser?.id === job.created_by;
    const hasApplied = isStudent && AppState.applications.some(app =>
        app.student_id === AppState.currentUser.id && app.job_id === job.id
    );

    return `
        <div class="job-card ${isMatchHighlight || (match && match.score >= 80) ? 'matched-highlight' : ''}">
            <div>
                <div class="job-card-header">
                    <span class="job-dept-badge" title="${job.department}">🏢 ${job.department}</span>
                    <span class="job-status-pill ${job.status}">
                        ${job.status === 'open' ? '🟢 เปิดรับสมัคร' : '🔴 ปิดรับแล้ว'}
                    </span>
                </div>

                <h3 class="job-title">${escapeHTML(job.title)}</h3>
                
                <div class="job-instructor">
                    <span class="inst-avatar">${(job.instructor_name || 'อ').charAt(0)}</span>
                    <span>ผู้ประกาศ: <strong>${escapeHTML(job.instructor_name)}</strong></span>
                </div>

                <div class="job-meta-row">
                    ${job.compensation ? `<span class="job-meta-item stipend">💰 ค่าตอบแทน ${escapeHTML(job.compensation)}</span>` : ''}
                    ${job.stipend ? `<span class="job-meta-item stipend">🧾 เบี้ยเลี้ยง ${escapeHTML(formatJobStipend(job))}</span>` : ''}
                    ${job.activity_hours !== null && job.activity_hours !== undefined ? `<span class="job-meta-item">🎓 ชั่วโมงกิจกรรม ${escapeHTML(String(job.activity_hours))} ชม. (${escapeHTML(job.activity_scope || 'มหาลัย')})</span>` : ''}
                    ${job.benefits ? `<span class="job-meta-item">✨ ${escapeHTML(job.benefits)}</span>` : ''}
                    <span class="job-meta-item">👥 รับ ${job.positions || 1} อัตรา</span>
                    ${job.duration ? `<span class="job-meta-item">⏱️ ${escapeHTML(job.duration)}</span>` : ''}
                </div>

                <p class="job-description-snippet">${escapeHTML(job.description || '')}</p>

                ${isStudent && match ? `
                    <div class="matching-banner">
                        <span class="matching-score-badge">
                            <span>🎯 ทักษะตรงกับคุณ</span>
                            <strong>${match.score}%</strong>
                        </span>
                        <div class="matching-bar-wrap">
                            <div class="matching-bar-fill" style="width: ${match.score}%;"></div>
                        </div>
                        <span style="font-size:0.75rem; color:var(--text-secondary);">${match.matchLevel}</span>
                    </div>
                ` : ''}

                <div class="skills-list">
                    ${(job.required_skills || []).map(skill => {
        const isMatched = isStudent && match?.matchedSkills.includes(skill);
        return `<span class="skill-tag ${isMatched ? 'matched' : ''}">${isMatched ? '✓ ' : ''}${escapeHTML(skill)}</span>`;
    }).join('')}
                </div>
            </div>

            <div class="job-card-footer">
                <span class="job-deadline">
                    📅 กำหนดปิด: ${job.deadline ? formatDate(job.deadline) : 'จนกว่าจะได้คน'}
                </span>
                <div class="job-card-actions">
                    <button class="btn btn-outline btn-sm" onclick="window.linkUApp.openJobDetailModal('${job.id}')">
                        รายละเอียด
                    </button>
                    ${isStudent ? `
                        <button type="button" class="btn btn-primary btn-sm job-apply-button${hasApplied ? ' is-applied' : ''}"
                            data-apply-job-id="${escapeHTML(job.id)}" ${hasApplied ? 'disabled aria-disabled="true"' : ''}
                            onclick="window.linkUApp.openApplyModal('${job.id}')">
                            ${hasApplied ? 'สมัครไปแล้ว' : 'สมัครงาน'}
                        </button>
                    ` : ''}
                    ${(isAuthor || AppState.currentUser?.role === 'admin') ? `
                        <button class="btn btn-outline btn-sm" onclick="window.linkUApp.openJobEditorModal('${job.id}')" title="แก้ไขงาน">
                            ✏️ แก้ไข
                        </button>
                    ` : ''}
                    ${AppState.currentUser?.role === 'admin' ? `
                        <button class="btn btn-danger btn-sm" onclick="window.linkUApp.confirmDeleteJob('${job.id}')" title="ลบงานนี้ (Admin)">
                            🗑️
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function updateApplyButtonState(jobId, state) {
    document.querySelectorAll('.job-apply-button').forEach(button => {
        if (button.dataset.applyJobId !== jobId) return;
        const applied = state === 'applied';
        button.disabled = state !== 'ready';
        button.setAttribute('aria-disabled', String(state !== 'ready'));
        button.classList.toggle('is-applied', applied);
        button.classList.toggle('is-submitting', state === 'submitting');
        button.textContent = applied ? 'สมัครไปแล้ว' : state === 'submitting' ? 'กำลังสมัคร...' : 'สมัครงาน';
    });
}

// =========================================================================
// VIEW: 2. AI Matching Recommendations Feed
// =========================================================================
async function renderMatchingFeed() {
    const container = document.getElementById('viewContainer');
    AppState.jobs = await DB.getJobs({ status: 'open' });

    if (AppState.currentUser.role !== 'student') {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">👨‍🏫</div>
                <h3 class="empty-title">โหมดนี้สำหรับนักศึกษา</h3>
                <p class="empty-text">ระบบจะแนะนำงานที่ตรงกับทักษะของนักศึกษาโดยอัตโนมัติ กรุณาสลับเป็นบทบาทนักศึกษาเพื่อทดลองใช้งาน</p>
                <button class="btn btn-primary" onclick="window.linkUApp.toggleUserRole()">
                    สลับบทบาทเป็นนักศึกษา
                </button>
            </div>
        `;
        return;
    }

    const studentSkills = AppState.currentUser.skills || [];
    const rankedJobs = MatchingEngine.rankJobsForStudent(AppState.currentUser, AppState.jobs);

    container.innerHTML = `
        <div class="section-header">
            <div>
                <h1 class="section-title">
                    <span>🎯 AI Matching: งานที่ตรงกับทักษะของคุณ</span>
                </h1>
                <p style="font-size:0.88rem; color:var(--text-secondary); margin-top:4px;">
                    วิเคราะห์ความเหมาะสมจากทักษะที่คุณระบุไว้ในโปรไฟล์: 
                    <strong>${studentSkills.length > 0 ? studentSkills.join(', ') : 'ยังไม่ได้ระบุทักษะ'}</strong>
                    <a href="javascript:void(0)" onclick="window.linkUApp.navigateTo('profile')" style="color:var(--primary); margin-left:6px;">[แก้ไขทักษะ]</a>
                </p>
            </div>
        </div>

        ${rankedJobs.length === 0 ? `
            <div class="empty-state">
                <div class="empty-icon">💡</div>
                <h3 class="empty-title">ยังไม่มีงานที่ตรงกับเงื่อนไขในขณะนี้</h3>
                <p class="empty-text">ลองเข้าไปเพิ่มทักษะในโปรไฟล์ของคุณเพื่อเพิ่มโอกาสในการจับคู่งาน</p>
            </div>
        ` : `
            <div class="jobs-grid">
                ${rankedJobs.map(job => renderJobCardHTML(job, true)).join('')}
            </div>
        `}
    `;
}

// =========================================================================
// VIEW: 3. My Applications (Student Status Tracking)
// =========================================================================
async function renderMyApplicationsView() {
    const container = document.getElementById('viewContainer');
    AppState.applications = await DB.getApplications({ student_id: AppState.currentUser.id });
    AppState.jobs = await DB.getJobs();

    const appsWithJobs = AppState.applications.map(app => {
        const job = AppState.jobs.find(j => j.id === app.job_id) || {};
        return { ...app, job };
    });

    container.innerHTML = `
        <div class="section-header">
            <div>
                <h1 class="section-title">
                    <span>📋 งานที่ฉันสมัครเข้าร่วม</span>
                    <span class="section-counter">(${appsWithJobs.length} รายการ)</span>
                </h1>
                <p style="font-size:0.88rem; color:var(--text-secondary); margin-top:4px;">
                    ติดตามความคืบหน้าของใบสมัครและสถานะการดำเนินงานโครงการ
                </p>
            </div>
        </div>

        ${appsWithJobs.length === 0 ? `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3 class="empty-title">คุณยังไม่ได้สมัครงานหรือโครงการใดๆ</h3>
                <p class="empty-text">เลือกดูประกาศงานที่สนใจและกดสมัครเพื่อเริ่มต้นสั่งสมประสบการณ์จริง</p>
                <button class="btn btn-primary" onclick="window.linkUApp.navigateTo('jobs')">
                    🔍 ไปที่หน้าค้นหางาน
                </button>
            </div>
        ` : `
            <div style="display:flex; flex-direction:column; gap:18px;">
                ${appsWithJobs.map(app => renderApplicationTrackerCard(app)).join('')}
            </div>
        `}
    `;
}

function renderApplicationTrackerCard(app) {
    const job = app.job;
    const statusMap = {
        'pending': { label: '⏳ รอพิจารณา', class: 'badge-amber', step: 1 },
        'approved': { label: '✅ ได้รับการอนุมัติ', class: 'badge-emerald', step: 2 },
        'in_progress': { label: '🚀 กำลังดำเนินงาน', class: 'badge-blue', step: 3 },
        'completed': { label: '🏆 เสร็จสิ้นโครงการ', class: 'badge-purple', step: 4 },
        'rejected': { label: '❌ ไม่ผ่านการคัดเลือก', class: 'badge-gray', step: -1 }
    };

    const curStatus = statusMap[app.status] || statusMap['pending'];

    return `
        <div class="job-card" style="padding:22px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
                <div>
                    <span class="job-dept-badge">🏢 ${escapeHTML(job.department || 'หน่วยงาน')}</span>
                    <h3 class="job-title" style="margin-top:6px;">${escapeHTML(job.title || 'ชื่องาน')}</h3>
                    <div style="font-size:0.85rem; color:var(--text-secondary);">
                        ผู้รับผิดชอบ: <strong>${escapeHTML(job.instructor_name || '-')}</strong> • สมัครเมื่อ: ${formatDate(app.created_at)}
                    </div>
                </div>
                <div>
                    <span class="job-status-pill ${app.status === 'completed' || app.status === 'approved' ? 'open' : ''}">
                        ${curStatus.label}
                    </span>
                </div>
            </div>

            <!-- Pipeline Visual Stepper -->
            <div class="status-pipeline">
                <div class="pipeline-step ${curStatus.step >= 1 ? 'completed' : ''} ${curStatus.step === 1 ? 'active' : ''}">
                    <div class="step-icon">1</div>
                    <span class="step-label">รอพิจารณา</span>
                </div>
                <div class="pipeline-step ${curStatus.step >= 2 ? 'completed' : ''} ${curStatus.step === 2 ? 'active' : ''}">
                    <div class="step-icon">2</div>
                    <span class="step-label">อนุมัติแล้ว</span>
                </div>
                <div class="pipeline-step ${curStatus.step >= 3 ? 'completed' : ''} ${curStatus.step === 3 ? 'active' : ''}">
                    <div class="step-icon">3</div>
                    <span class="step-label">กำลังดำเนินงาน</span>
                </div>
                <div class="pipeline-step ${curStatus.step >= 4 ? 'completed' : ''} ${curStatus.step === 4 ? 'active' : ''}">
                    <div class="step-icon">4</div>
                    <span class="step-label">เสร็จสิ้นโครงการ</span>
                </div>
            </div>

            <div style="background:var(--bg-subtle); padding:12px 14px; border-radius:var(--radius-sm); font-size:0.86rem; margin-bottom:14px;">
                <strong>ข้อความแนะนำตัวของคุณ:</strong> ${escapeHTML(app.message || 'ไม่มีข้อความ')}
                ${app.portfolio_link ? `<div style="margin-top:4px;"><strong>Portfolio:</strong> <a href="${escapeHTML(app.portfolio_link)}" target="_blank" style="color:var(--primary);">${escapeHTML(app.portfolio_link)}</a></div>` : ''}
            </div>

            <div class="job-card-footer">
                <span style="font-size:0.8rem; color:var(--text-muted);">
                    🎯 คะแนน Matching: <strong>${app.matching_score || 0}%</strong>
                </span>
                <div class="job-card-actions">
                    <button class="btn btn-primary btn-sm" onclick="window.linkUApp.openChatWithUser('${job.created_by}', '${escapeHTML(job.instructor_name)}', '${job.id}', '${escapeHTML(job.title)}')">
                        💬 แชทกับอาจารย์ผู้รับผิดชอบ
                    </button>
                </div>
            </div>
        </div>
    `;
}

// =========================================================================
// VIEW: 4. Manage Jobs (Instructor / Department)
// =========================================================================
async function renderManageJobsView() {
    const container = document.getElementById('viewContainer');
    AppState.jobs = await DB.getJobs({ created_by: AppState.currentUser.id });
    const allApps = await DB.getApplications();

    container.innerHTML = `
        <div class="section-header">
            <div>
                <h1 class="section-title">
                    <span>📁 จัดการงานและโครงการที่คุณประกาศ</span>
                    <span class="section-counter">(${AppState.jobs.length} รายการ)</span>
                </h1>
                <p style="font-size:0.88rem; color:var(--text-secondary); margin-top:4px;">
                    จัดการรายละเอียดประกาศ เปิด/ปิดรับสมัคร และตรวจสอบจำนวนผู้สมัคร
                </p>
            </div>
            <button class="btn btn-primary" onclick="window.linkUApp.openJobEditorModal()">
                <span>➕ ประกาศงานใหม่</span>
            </button>
        </div>

        ${AppState.jobs.length === 0 ? `
            <div class="empty-state">
                <div class="empty-icon">📢</div>
                <h3 class="empty-title">คุณยังไม่มีประกาศงานในระบบ</h3>
                <p class="empty-text">สร้างประกาศรับสมัครงานหรือโครงการแรกของคุณเพื่อให้นักศึกษาเริ่มสมัคร</p>
                <button class="btn btn-primary" onclick="window.linkUApp.openJobEditorModal()">
                    <span>➕ ประกาศงานใหม่ทันที</span>
                </button>
            </div>
        ` : `
            <div class="jobs-grid">
                ${AppState.jobs.map(job => {
        const applicantCount = allApps.filter(a => a.job_id === job.id).length;
        return `
                        <div class="job-card">
                            <div>
                                <div class="job-card-header">
                                    <span class="job-dept-badge">🏢 ${escapeHTML(job.department)}</span>
                                    <span class="job-status-pill ${job.status}">
                                        ${job.status === 'open' ? '🟢 เปิดรับสมัคร' : '🔴 ปิดรับสมัครแล้ว'}
                                    </span>
                                </div>

                                <h3 class="job-title">${escapeHTML(job.title)}</h3>
                                <p class="job-description-snippet">${escapeHTML(job.description)}</p>

                                <div class="job-meta-row">
                                    <span class="job-meta-item">👥 ผู้สมัครแล้ว: <strong>${applicantCount} คน</strong></span>
                                    <span class="job-meta-item">🎯 รับ: ${job.positions} คน</span>
                                    ${job.compensation ? `<span class="job-meta-item stipend">💰 ค่าตอบแทน ${escapeHTML(job.compensation)}</span>` : ''}
                                    ${job.stipend ? `<span class="job-meta-item stipend">🧾 เบี้ยเลี้ยง ${escapeHTML(formatJobStipend(job))}</span>` : ''}
                                    ${job.activity_hours !== null && job.activity_hours !== undefined ? `<span class="job-meta-item">🎓 ชั่วโมงกิจกรรม ${escapeHTML(String(job.activity_hours))} ชม. (${escapeHTML(job.activity_scope || 'มหาลัย')})</span>` : ''}
                                    ${job.benefits ? `<span class="job-meta-item">✨ ${escapeHTML(job.benefits)}</span>` : ''}
                                </div>
                            </div>

                            <div class="job-card-footer">
                                <div style="display:flex; gap:6px;">
                                    <button class="btn btn-outline btn-sm" onclick="window.linkUApp.toggleJobStatus('${job.id}', '${job.status === 'open' ? 'closed' : 'open'}')">
                                        ${job.status === 'open' ? 'ปิดรับ' : 'เปิดรับ'}
                                    </button>
                                    <button class="btn btn-outline btn-sm" onclick="window.linkUApp.openJobEditorModal('${job.id}')">
                                        ✏️ แก้ไข
                                    </button>
                                    <button class="btn btn-danger btn-sm" onclick="window.linkUApp.confirmDeleteJob('${job.id}')">
                                        🗑️
                                    </button>
                                </div>
                                <button class="btn btn-primary btn-sm" onclick="window.linkUApp.navigateTo('manage-applicants')">
                                    ดูผู้สมัคร (${applicantCount})
                                </button>
                            </div>
                        </div>
                    `;
    }).join('')}
            </div>
        `}
    `;
}

// =========================================================================
// VIEW: 5. Manage Applicants (Instructor: AI Matching Ranks, Status, Review)
// =========================================================================
async function renderManageApplicantsView() {
    const container = document.getElementById('viewContainer');
    const myJobs = await DB.getJobs({ created_by: AppState.currentUser.id });
    const allApplications = await DB.getApplications();
    const statusFilter = AppState.applicantStatusFilter || 'all';

    // Filter applicants for instructor's jobs
    const jobIds = myJobs.map(j => j.id);
    const applicants = allApplications.filter(a =>
        jobIds.includes(a.job_id) && (statusFilter === 'all' || a.status === statusFilter)
    );

    // Attach student profile & recalculate match
    const enrichedApplicants = [];
    for (const app of applicants) {
        const studentProfile = await DB.getProfile(app.student_id);
        const job = myJobs.find(j => j.id === app.job_id);
        const matchResult = studentProfile && job ? MatchingEngine.calculateMatch(studentProfile, job) : { score: app.matching_score || 0, matchedSkills: [], missingSkills: [] };
        enrichedApplicants.push({
            ...app,
            job,
            studentProfile,
            matchResult
        });
    }

    // Sort by Matching Score descending
    enrichedApplicants.sort((a, b) => (b.matchResult?.score || 0) - (a.matchResult?.score || 0));

    container.innerHTML = `
        <div class="section-header">
            <div>
                <h1 class="section-title">
                    <span>👥 รายชื่อผู้สมัครงานและโครงการ</span>
                    <span class="section-counter">(${enrichedApplicants.length} คน)</span>
                </h1>
                <p style="font-size:0.88rem; color:var(--text-secondary); margin-top:4px;">
                    เรียงลำดับตาม <strong>AI Matching Score</strong> จากทักษะที่ตรงกับความต้องการของงานมากที่สุด
                </p>
            </div>
            <div class="applicant-status-filter">
                <label class="form-label" for="applicantStatusFilter">สถานะใบสมัคร</label>
                <select id="applicantStatusFilter" class="form-select" onchange="window.linkUApp.navigateToApplicants(this.value)">
                    <option value="all" ${statusFilter === 'all' ? 'selected' : ''}>ทุกสถานะ</option>
                    <option value="pending" ${statusFilter === 'pending' ? 'selected' : ''}>รอพิจารณา</option>
                    <option value="approved" ${statusFilter === 'approved' ? 'selected' : ''}>ได้รับการอนุมัติ</option>
                    <option value="in_progress" ${statusFilter === 'in_progress' ? 'selected' : ''}>กำลังดำเนินงาน</option>
                    <option value="completed" ${statusFilter === 'completed' ? 'selected' : ''}>เสร็จสิ้นโครงการ</option>
                    <option value="rejected" ${statusFilter === 'rejected' ? 'selected' : ''}>ไม่ผ่านการคัดเลือก</option>
                </select>
            </div>
        </div>

        ${enrichedApplicants.length === 0 ? `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <h3 class="empty-title">ยังไม่มีผู้สมัครในโครงการของคุณ</h3>
                <p class="empty-text">เมื่อนักศึกษากดสมัครงาน รายชื่อและคะแนน AI Matching จะปรากฏที่นี่</p>
            </div>
        ` : `
            <div style="display:flex; flex-direction:column; gap:18px;">
                ${enrichedApplicants.map(app => renderApplicantRowHTML(app)).join('')}
            </div>
        `}
    `;
}

function renderApplicantRowHTML(app) {
    const student = app.studentProfile || { full_name: app.student_name, email: app.student_email };
    const job = app.job || {};
    const match = app.matchResult;
    const studentYear = getStudentYear(student);

    return `
        <div class="job-card" style="padding:22px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
                <div style="display:flex; gap:14px; align-items:flex-start;">
                    <div class="user-avatar" style="width:48px; height:48px; font-size:1.2rem; flex-shrink:0;">
                        ${student.avatar_url ? `<img src="${student.avatar_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : student.full_name.charAt(0)}
                    </div>
                    <div>
                        <h3 style="font-size:1.15rem; font-weight:700;">${escapeHTML(student.full_name)}</h3>
                        <div style="font-size:0.83rem; color:var(--text-secondary);">
                            ${escapeHTML(student.faculty || 'นักศึกษา')}${studentYear ? ` • ${escapeHTML(studentYear)}` : ''} • 📧 ${escapeHTML(student.email)}
                        </div>
                        <div style="margin-top:6px; font-size:0.85rem;">
                            สมัครตำแหน่ง: <strong>${escapeHTML(job.title || 'ไม่ระบุ')}</strong>
                        </div>
                    </div>
                </div>

                <!-- Matching Score Pill -->
                <div style="text-align:right;">
                    <div style="display:inline-flex; align-items:center; gap:6px; background:#EFF6FF; border:1px solid #BFDBFE; padding:6px 14px; border-radius:var(--radius-full);">
                        <span style="font-size:0.82rem; font-weight:600; color:var(--primary);">🎯 AI Matching</span>
                        <strong style="font-size:1.1rem; color:var(--primary);">${match.score}%</strong>
                    </div>
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">
                        ${match.matchLevel || ''}
                    </div>
                </div>
            </div>

            <!-- Matched Skills Analysis -->
            <div style="margin:14px 0; background:var(--bg-subtle); padding:12px 14px; border-radius:var(--radius-md);">
                <div style="font-size:0.82rem; font-weight:600; margin-bottom:6px; color:var(--text-secondary);">
                    การวิเคราะห์ทักษะ (Skill Comparison):
                </div>
                <div class="skills-list" style="margin-bottom:0;">
                    ${(job.required_skills || []).map(skill => {
        const isMatched = match.matchedSkills.includes(skill);
        return `
                            <span class="skill-tag ${isMatched ? 'matched' : 'missing'}">
                                ${isMatched ? '✓ ' + escapeHTML(skill) + ' (ตรง)' : '✗ ' + escapeHTML(skill) + ' (ยังขาด)'}
                            </span>
                        `;
    }).join('')}
                </div>
            </div>

            <!-- Applicant Cover Note -->
            ${app.message ? `
                <div style="font-size:0.88rem; color:var(--text-primary); margin-bottom:12px; background:#FFFFFF; border:1px solid var(--border-color); padding:10px 14px; border-radius:var(--radius-sm);">
                    <strong>ข้อความจากผู้สมัคร:</strong> "${escapeHTML(app.message)}"
                    ${app.portfolio_link ? `<div style="margin-top:4px;">🔗 <a href="${escapeHTML(app.portfolio_link)}" target="_blank" style="color:var(--primary); font-weight:600;">เปิดดู Portfolio</a></div>` : ''}
                </div>
            ` : ''}
            ${app.attachment_path ? `
                <div style="margin-bottom:12px;">
                    <button type="button" class="btn btn-outline btn-sm" onclick="window.linkUApp.openApplicationAttachment('${escapeHTML(app.attachment_path)}')">
                        📎 เปิดไฟล์แนบ: ${escapeHTML(app.attachment_name || 'ไฟล์สมัครงาน')}
                    </button>
                </div>
            ` : ''}

            <!-- Status Controls and Actions -->
            <div class="job-card-footer" style="flex-wrap:wrap; gap:12px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <label style="font-size:0.82rem; font-weight:600; color:var(--text-secondary);">ปรับสถานะ:</label>
                    <select class="form-select" style="padding:5px 10px; font-size:0.82rem; width:auto;" onchange="window.linkUApp.changeApplicationStatus('${app.id}', this.value)">
                        <option value="pending" ${app.status === 'pending' ? 'selected' : ''}>⏳ รอพิจารณา</option>
                        <option value="approved" ${app.status === 'approved' ? 'selected' : ''}>✅ อนุมัติ / รับเข้าทำงาน</option>
                        <option value="in_progress" ${app.status === 'in_progress' ? 'selected' : ''}>🚀 กำลังดำเนินงาน</option>
                        <option value="completed" ${app.status === 'completed' ? 'selected' : ''}>🏆 เสร็จสิ้นโครงการ</option>
                        <option value="rejected" ${app.status === 'rejected' ? 'selected' : ''}>❌ ไม่ผ่านการคัดเลือก</option>
                    </select>
                </div>

                <div class="job-card-actions">
                    <button class="btn btn-outline btn-sm" onclick="window.linkUApp.openStudentProfile('${escapeHTML(student.id || app.student_id)}')">
                        👤 ดูโปรไฟล์นักศึกษา
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="window.linkUApp.openChatWithUser('${app.student_id}', '${escapeHTML(student.full_name)}', '${job.id}', '${escapeHTML(job.title)}')">
                        💬 แชท
                    </button>
                    ${app.status === 'completed' ? `
                        <button class="btn btn-success btn-sm" onclick="window.linkUApp.openReviewModal('${app.id}', '${app.student_id}', '${escapeHTML(student.full_name)}', '${job.id}', '${escapeHTML(job.title)}')">
                            ⭐ ให้คะแนนและรีวิว
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

export async function openStudentProfile(studentId) {
    const student = await DB.getProfile(studentId);
    if (!student) {
        showToast('ไม่พบโปรไฟล์นักศึกษา', 'error');
        return;
    }
    const portfolios = await DB.getPortfolios(studentId);
    const avatarUrl = /^https?:\/\//i.test(student.avatar_url || '') ? escapeHTML(student.avatar_url) : '';
    const studentYear = getStudentYear(student);
    const body = document.getElementById('studentProfileModalBody');
    body.innerHTML = `
        <div class="student-profile-heading">
            <div class="user-avatar student-profile-avatar">
                ${avatarUrl ? `<img src="${avatarUrl}" alt="">` : escapeHTML((student.full_name || 'น').charAt(0))}
            </div>
            <div>
                <h2>${escapeHTML(student.full_name || 'นักศึกษา')}</h2>
                <div class="form-help">${escapeHTML(student.faculty || 'ไม่ระบุคณะ')} · ${escapeHTML(student.department || 'ไม่ระบุสาขา')}</div>
            </div>
        </div>
        <dl class="student-profile-details">
            ${studentYear ? `<div><dt>ชั้นปี</dt><dd>${escapeHTML(studentYear)}</dd></div>` : ''}
            ${student.email ? `<div><dt>อีเมล</dt><dd>${escapeHTML(student.email)}</dd></div>` : ''}
            ${student.phone ? `<div><dt>โทรศัพท์</dt><dd>${escapeHTML(student.phone)}</dd></div>` : ''}
        </dl>
        ${student.bio ? `<section class="student-profile-section"><h4>แนะนำตัว</h4><p>${escapeHTML(student.bio)}</p></section>` : ''}
        ${(student.skills || []).length ? `<section class="student-profile-section"><h4>ทักษะ</h4><div class="skills-list">${student.skills.map(skill => `<span class="skill-tag">${escapeHTML(skill)}</span>`).join('')}</div></section>` : ''}
        ${student.interests ? `<section class="student-profile-section"><h4>ความสนใจ</h4><p>${escapeHTML(student.interests)}</p></section>` : ''}
        <section class="student-profile-section">
            <h4>Portfolio (${portfolios.length})</h4>
            ${portfolios.length ? portfolios.map(item => `
                <div class="student-profile-portfolio">
                    <strong>${escapeHTML(item.title || 'ผลงาน')}</strong>
                    ${item.category ? `<span>${escapeHTML(item.category)}</span>` : ''}
                    ${item.description ? `<p>${escapeHTML(item.description)}</p>` : ''}
                </div>
            `).join('') : '<p class="form-help">ยังไม่มีผลงานใน Portfolio</p>'}
        </section>
    `;
    openModal('studentProfileModal');
}

// =========================================================================
// VIEW: 6. Real-time Chat View
// =========================================================================
async function renderChatView() {
    const container = document.getElementById('viewContainer');
    const myId = AppState.currentUser.id;

    // Load all conversations based on applications and messages
    const allApps = await DB.getApplications();
    const allJobs = await DB.getJobs();
    const relevantApps = allApps.filter(a => a.student_id === myId || (allJobs.find(j => j.id === a.job_id)?.created_by === myId));

    const conversations = [];
    for (const app of relevantApps) {
        const job = allJobs.find(j => j.id === app.job_id);
        if (!job) continue;

        const otherUserId = AppState.currentUser.role === 'student' ? job.created_by : app.student_id;
        const otherProfile = await DB.getProfile(otherUserId);
        if (otherProfile) {
            const messages = await DB.getMessages(job.id, myId, otherUserId);
            conversations.push({
                jobId: job.id,
                jobTitle: job.title,
                otherUser: otherProfile,
                unreadCount: messages.filter(message =>
                    message.receiver_id === myId && !message.is_read
                ).length
            });
        }
    }

    if (!AppState.activeChat && conversations.length > 0) {
        AppState.activeChat = conversations[0];
    }

    container.innerHTML = `
        <div class="section-header">
            <div>
                <h1 class="section-title">
                    <span>💬 แชทสื่อสารและติดตามงาน (Real-time Chat)</span>
                </h1>
                <p style="font-size:0.88rem; color:var(--text-secondary); margin-top:4px;">
                    พูดคุยและสอบถามรายละเอียดระหว่างนักศึกษากับอาจารย์ผู้ดูแลโครงการ บันทึกบน Supabase เรียลไทม์
                </p>
            </div>
        </div>

        <div class="chat-layout">
            <div class="chat-sidebar">
                <div class="chat-sidebar-header">
                    <span>รายการสนทนา (${conversations.length})</span>
                </div>
                <ul class="chat-list">
                    ${conversations.length === 0 ? `
                        <li style="padding:20px; font-size:0.85rem; color:var(--text-muted); text-align:center;">
                            ยังไม่มีบทสนทนา (จะเริ่มแชทได้เมื่อมีการสมัครงาน)
                        </li>
                    ` : conversations.map(c => `
                        <li class="chat-item ${AppState.activeChat?.jobId === c.jobId && AppState.activeChat?.otherUser.id === c.otherUser.id ? 'active' : ''}" 
                            onclick="window.linkUApp.selectChatConversation('${c.otherUser.id}', '${escapeHTML(c.otherUser.full_name)}', '${c.jobId}', '${escapeHTML(c.jobTitle)}')">
                            <div class="chat-item-avatar">
                                ${c.otherUser.avatar_url ? `<img src="${c.otherUser.avatar_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : c.otherUser.full_name.charAt(0)}
                            </div>
                            <div class="chat-item-info">
                                <div class="chat-item-title">${escapeHTML(c.otherUser.full_name)}</div>
                                <div class="chat-item-subtitle">${escapeHTML(c.jobTitle)}</div>
                            </div>
                            ${c.unreadCount ? `<span class="chat-unread-badge">${c.unreadCount > 99 ? '99+' : c.unreadCount}</span>` : ''}
                        </li>
                    `).join('')}
                </ul>
            </div>

            <div class="chat-main">
                ${AppState.activeChat ? `
                    <div class="chat-main-header">
                        <div class="chat-main-header-info">
                            <div class="chat-item-avatar" style="width:36px; height:36px;">
                                ${AppState.activeChat.otherUser.avatar_url ? `<img src="${AppState.activeChat.otherUser.avatar_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : AppState.activeChat.otherUser.full_name.charAt(0)}
                            </div>
                            <div>
                                <div class="chat-header-title">${escapeHTML(AppState.activeChat.otherUser.full_name)}</div>
                                <div class="chat-header-subtitle">โครงการ: ${escapeHTML(AppState.activeChat.jobTitle)}</div>
                            </div>
                        </div>
                        <div>
                            <span class="user-role-badge">${AppState.activeChat.otherUser.role === 'instructor' ? 'อาจารย์' : 'นักศึกษา'}</span>
                        </div>
                    </div>

                    <div class="chat-messages-area" id="chatMessagesArea">
                        <!-- Loaded dynamically -->
                        <div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">กำลังโหลดข้อความ...</div>
                    </div>

                    <form class="chat-input-bar" id="chatInputForm" onsubmit="window.linkUApp.sendChatMessage(event)">
                        <div class="chat-attachment-menu">
                            <button type="button" class="btn btn-outline chat-tool-btn chat-attachment-toggle" id="chatAttachmentToggle"
                                aria-label="เพิ่มไฟล์แนบ" aria-expanded="false" title="เพิ่มไฟล์แนบ">+</button>
                            <div class="chat-attachment-popover" id="chatAttachmentPopover" hidden>
                                <button type="button" onclick="document.getElementById('chatImageInput').click(); window.linkUApp.closeChatAttachmentMenu()">🖼️ รูปภาพ</button>
                                <button type="button" onclick="document.getElementById('chatDocumentInput').click(); window.linkUApp.closeChatAttachmentMenu()">📄 ไฟล์งาน</button>
                                <button type="button" onclick="window.linkUApp.openChatLinkModal(); window.linkUApp.closeChatAttachmentMenu()">🔗 ลิงก์งาน</button>
                            </div>
                        </div>
                        <input type="file" id="chatImageInput" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                            hidden onchange="window.linkUApp.handleChatAttachment(event)">
                        <input type="file" id="chatDocumentInput" accept=".pdf,.doc,.docx,.zip,.xlsx,.pptx,.txt"
                            hidden onchange="window.linkUApp.handleChatAttachment(event)">
                        <input type="text" class="chat-input" id="chatMessageInput" placeholder="พิมพ์ข้อความที่นี่... (กด Enter เพื่อส่ง)" autocomplete="off">
                        <button type="submit" class="btn btn-primary" style="border-radius:var(--radius-full); padding:10px 20px;">
                            <span>ส่ง ✈️</span>
                        </button>
                    </form>
                ` : `
                    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--text-muted);">
                        <div style="font-size:3rem; margin-bottom:12px;">💬</div>
                        <div>เลือกบทสนทนาจากเมนูด้านซ้ายเพื่อเริ่มพูดคุย</div>
                    </div>
                `}
            </div>
        </div>
    `;

    if (AppState.activeChat) {
        await loadChatMessages();
    }
}

async function loadChatMessages() {
    if (!AppState.activeChat) return;
    const area = document.getElementById('chatMessagesArea');
    if (!area) return;

    const activeChat = AppState.activeChat;
    try {
        await DB.markMessagesRead(activeChat.jobId, AppState.currentUser.id, activeChat.otherUser.id);
        document.querySelector('.chat-item.active .chat-unread-badge')?.remove();
    } catch (error) {
        console.warn('Unable to mark chat messages as read:', error);
        showToast('ไม่สามารถอัปเดตสถานะอ่านข้อความได้', 'error');
    }
    const messages = await DB.getMessages(activeChat.jobId, AppState.currentUser.id, activeChat.otherUser.id);
    if (!document.getElementById('chatMessagesArea')) return;
    updateNotificationBadges();

    if (messages.length === 0) {
        area.innerHTML = `
            <div style="text-align:center; padding:30px; color:var(--text-muted); font-size:0.86rem;">
                👋 ยังไม่มีข้อความ เริ่มต้นส่งข้อความทักทายได้เลยครับ!
            </div>
        `;
        return;
    }

    area.innerHTML = messages.map(m => {
        const isMe = m.sender_id === AppState.currentUser.id;
        return `
            <div class="message-bubble-row ${isMe ? 'me' : 'other'}">
                <div class="message-bubble">
                    ${renderChatMessageContent(m)}
                    <div class="message-meta">${formatTime(m.created_at)}</div>
                </div>
            </div>
        `;
    }).join('');

    scrollChatToBottom(area);
}

function scrollChatToBottom(area) {
    const scrollToBottom = () => {
        area.scrollTo({ top: area.scrollHeight, behavior: 'smooth' });
    };
    scrollToBottom();
    requestAnimationFrame(scrollToBottom);
    area.querySelectorAll('.chat-image-preview img').forEach(image => {
        if (!image.complete) image.addEventListener('load', scrollToBottom, { once: true });
    });
}

async function sendChatMessage(e) {
    e.preventDefault();
    const input = document.getElementById('chatMessageInput');
    if (!input || !AppState.activeChat) return;

    const content = input.value.trim();
    if (!content) return;

    input.value = '';

    const newMsg = {
        job_id: AppState.activeChat.jobId,
        sender_id: AppState.currentUser.id,
        sender_name: AppState.currentUser.full_name,
        sender_role: AppState.currentUser.role,
        receiver_id: AppState.activeChat.otherUser.id,
        content: content
    };

    try {
        await DB.sendMessage(newMsg, { strict: true });
        await loadChatMessages();
    } catch (error) {
        input.value = content;
        showToast(`ส่งข้อความไม่สำเร็จ: ${error.message}`, 'error');
    }
}

function parseChatAttachment(content) {
    if (!content?.startsWith(CHAT_MESSAGE_PREFIX)) return null;
    try {
        const payload = JSON.parse(content.slice(CHAT_MESSAGE_PREFIX.length));
        if (['link', 'file', 'image'].includes(payload.type) &&
            typeof payload.url === 'string' &&
            typeof payload.title === 'string') {
            return payload;
        }
    } catch (error) {
        console.warn('Could not parse chat attachment message:', error);
    }
    return null;
}

function getSafeExternalUrl(value) {
    try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
        return '';
    }
}

function formatFileSize(bytes) {
    const size = Number(bytes);
    if (!Number.isFinite(size) || size < 0) return '';
    if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function renderChatMessageContent(message) {
    const content = message.content || '';
    let attachment = message.message_type && message.message_type !== 'text'
        ? {
            type: message.message_type,
            url: message.attachment_url || content,
            title: message.link_title || message.attachment_name || content,
            fileName: message.attachment_name,
            fileSize: message.attachment_size,
            description: message.link_description
        }
        : parseChatAttachment(content);
    if (!attachment) {
        const url = getSafeExternalUrl(content?.trim());
        if (!url) return escapeHTML(content);
        attachment = { type: 'link', url, title: url };
    }

    const url = getSafeExternalUrl(attachment.url);
    if (!url) return escapeHTML(content);

    const title = escapeHTML(attachment.title || attachment.fileName || url);
    if (attachment.type === 'image') {
        return `<a class="chat-image-preview" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" aria-label="เปิดรูปภาพขนาดเต็ม">
            <img src="${escapeHTML(url)}" alt="${title}" loading="lazy">
        </a>`;
    }
    const detail = attachment.type === 'file'
        ? `${attachment.fileSize ? formatFileSize(attachment.fileSize) : 'ไฟล์แนบ'}`
        : escapeHTML(attachment.description || url);
    return `
        <a class="chat-attachment-card" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer"
            ${attachment.type === 'file' ? 'download' : ''}>
            <span class="chat-attachment-icon">${attachment.type === 'file' ? '📄' : '🔗'}</span>
            <span class="chat-attachment-info">
                <strong>${title}</strong>
                <span>${detail}</span>
            </span>
            <span class="chat-attachment-action">${attachment.type === 'file' ? 'ดาวน์โหลด' : 'เปิดลิงก์'} ↗</span>
        </a>
    `;
}

function createChatMessage(content, metadata = {}) {
    return {
        job_id: AppState.activeChat.jobId,
        sender_id: AppState.currentUser.id,
        sender_name: AppState.currentUser.full_name,
        sender_role: AppState.currentUser.role,
        receiver_id: AppState.activeChat.otherUser.id,
        content,
        ...metadata
    };
}

function encodeChatAttachment(attachment) {
    return `${CHAT_MESSAGE_PREFIX}${JSON.stringify(attachment)}`;
}

export function openChatLinkModal() {
    if (!AppState.activeChat) return;
    document.getElementById('chatLinkForm').reset();
    openModal('chatLinkModal');
    document.getElementById('chatLinkUrlInput').focus();
}

export async function sendChatLink(e) {
    e.preventDefault();
    if (!AppState.activeChat) return;

    const url = getSafeExternalUrl(document.getElementById('chatLinkUrlInput').value.trim());
    const title = document.getElementById('chatLinkTitleInput').value.trim();
    const description = document.getElementById('chatLinkDescriptionInput').value.trim();
    if (!url) {
        showToast('กรุณากรอก URL ที่ขึ้นต้นด้วย http:// หรือ https://', 'error');
        return;
    }

    const submitButton = document.getElementById('chatLinkSubmitButton');
    submitButton.disabled = true;
    try {
        await DB.sendMessage(createChatMessage(url, {
            message_type: 'link',
            attachment_url: url,
            link_title: title,
            link_description: description
        }), { strict: true });
        closeModal('chatLinkModal');
        await loadChatMessages();
    } catch (error) {
        showToast(`ส่งลิงก์ไม่สำเร็จ: ${error.message}`, 'error');
    } finally {
        submitButton.disabled = false;
    }
}

export async function handleChatAttachment(e) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file || !AppState.activeChat) return;

    input.disabled = true;
    try {
        showToast('กำลังอัปโหลดไฟล์...', 'info');
        const attachment = await DB.uploadChatAttachment(file, AppState.currentUser.id);
        const isImage = attachment.contentType.startsWith('image/');
        await DB.sendMessage(createChatMessage(attachment.fileName, {
            message_type: isImage ? 'image' : 'file',
            attachment_url: attachment.url,
            attachment_name: attachment.fileName,
            attachment_size: attachment.fileSize,
            content_type: attachment.contentType
        }), { strict: true });
        showToast('ส่งไฟล์แนบเรียบร้อย', 'success');
        await loadChatMessages();
    } catch (error) {
        showToast(error.message || 'ไม่สามารถส่งไฟล์แนบได้', 'error');
    } finally {
        input.value = '';
        input.disabled = false;
    }
}

export function closeChatAttachmentMenu() {
    const popover = document.getElementById('chatAttachmentPopover');
    const toggle = document.getElementById('chatAttachmentToggle');
    if (popover) popover.hidden = true;
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
}

function handleIncomingRealtimeMessage(msg) {
    if (msg.receiver_id !== AppState.currentUser?.id) return;
    if (AppState.activeTab === 'chat' && AppState.activeChat) {
        if (msg.job_id === AppState.activeChat.jobId &&
            (msg.sender_id === AppState.activeChat.otherUser.id || msg.receiver_id === AppState.activeChat.otherUser.id)) {
            loadChatMessages();
        } else {
            const attachment = parseChatAttachment(msg.content);
            showToast(`💬 ข้อความใหม่จาก ${msg.sender_name}: ${attachment?.title || msg.content.substring(0, 30)}`, 'info');
            renderChatView();
        }
    } else {
        const attachment = parseChatAttachment(msg.content);
        const preview = attachment
            ? `${attachment.type === 'file' ? '📎' : '🔗'} ${attachment.title}`
            : msg.content.substring(0, 30);
        showToast(`💬 ข้อความใหม่จาก ${msg.sender_name}: "${preview}..."`, 'info');
    }
}

// =========================================================================
// VIEW: 7. User Profile & Portfolio (Requirement 2 & Top-right Click)
// =========================================================================
async function renderProfileView() {
    const container = document.getElementById('viewContainer');
    const user = AppState.currentUser;

    if (!user) {
        container.innerHTML = `
            <div class="empty-state" style="padding:60px 20px;">
                <div class="empty-icon">🔒</div>
                <h3 class="empty-title">กรุณาเข้าสู่ระบบ</h3>
                <p class="empty-text">คุณต้องเข้าสู่ระบบก่อนเพื่อดูและจัดการข้อมูลโปรไฟล์ของคุณ</p>
                <button class="btn btn-primary" onclick="window.linkUApp.openAuthModal()">
                    🔑 เข้าสู่ระบบ / สมัครสมาชิก
                </button>
            </div>
        `;
        return;
    }

    quickAvatarDataUrl = '';
    const portfolios = await DB.getPortfolios(user.id);
    const reviews = await DB.getReviews(user.id);

    const isStudent = user.role === 'student';

    container.innerHTML = `
        <div class="section-header">
            <div>
                <h1 class="section-title">
                    <span>👤 ข้อมูลโปรไฟล์และผลงาน (Profile & Portfolio)</span>
                </h1>
                <p style="font-size:0.88rem; color:var(--text-secondary); margin-top:4px;">
                    จัดการข้อมูลส่วนตัว ทักษะ และผลงานสำหรับใช้ประกอบการพิจารณาคัดเลือก
                </p>
            </div>
        </div>

        <!-- Unified Single Profile Card (รวมข้อมูลโปรไฟล์ทั้งหมดไว้ในช่องเดียว) -->
        <div class="job-card" style="margin-bottom:28px; padding:28px; background:#ffffff; border-radius:var(--radius-md); box-shadow:var(--shadow-sm); border:1px solid var(--border-color);">
            <form id="unifiedProfileForm" onsubmit="window.linkUApp.handleQuickContactSave(event)">
                <div style="display:flex; gap:24px; align-items:flex-start; flex-wrap:wrap;">
                    <!-- Avatar & Photo Upload Column -->
                    <div style="display:flex; flex-direction:column; align-items:center; gap:8px; width:130px; flex-shrink:0;">
                        <div class="user-avatar" id="quickAvatarPreview" style="width:88px; height:88px; font-size:2.2rem; flex-shrink:0; border:3px solid var(--primary-100); overflow:hidden; box-shadow:var(--shadow-sm);">
                            ${user.avatar_url ? `<img src="${user.avatar_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : user.full_name.charAt(0)}
                        </div>
                        <label class="btn btn-outline btn-sm" style="cursor:pointer; display:inline-flex; align-items:center; gap:6px; font-size:0.75rem; padding:4px 8px; width:100%; justify-content:center;">
                            <span>📷 เปลี่ยนรูปภาพ</span>
                            <input type="file" id="directAvatarFileInput" accept="image/*" style="display:none;" onchange="window.linkUApp.handleDirectAvatarFile(event)">
                        </label>
                    </div>

                    <!-- Main Info Column -->
                    <div style="flex:1; min-width:280px;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
                            <div>
                                <h2 style="font-size:1.45rem; font-weight:800; color:var(--text-primary); margin-bottom:4px;">
                                    ${escapeHTML(user.full_name)}
                                </h2>
                                <span class="user-role-badge" style="font-size:0.85rem; font-weight:600;">
                                    ${isStudent ? '👨‍🎓 นักศึกษาปริญญาตรี' : '👨‍🏫 อาจารย์ / บุคลากร'}
                                </span>
                            </div>
                            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                                <button type="button" class="btn btn-outline btn-sm" onclick="window.linkUApp.openProfileEditModal()" title="แก้ไขข้อมูลโปรไฟล์ทั้งหมด">
                                    ✏️ แก้ไขข้อมูลทั้งหมด
                                </button>
                            </div>
                        </div>

                        <!-- Contact Row (Email & Editable Phone Number) -->
                        <div style="display:flex; flex-wrap:wrap; gap:16px; align-items:center; margin-top:14px; padding:10px 14px; background:var(--bg-subtle); border-radius:var(--radius-sm); border:1px solid var(--border-color);">
                            <div style="font-size:0.88rem; color:var(--text-secondary); display:flex; align-items:center; gap:6px;">
                                <span>📧</span> <strong>อีเมล:</strong> <span>${escapeHTML(user.email)}</span>
                            </div>
                            <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:260px;">
                                <span style="font-size:0.88rem; color:var(--text-secondary); white-space:nowrap;">
                                    <strong>📞 เบอร์โทรศัพท์:</strong>
                                </span>
                                <input type="tel" id="directPhoneInput" class="form-input" 
                                    style="padding:4px 10px; font-size:0.88rem; height:32px; flex:1; min-width:140px; background:#ffffff;"
                                    placeholder="เช่น 081-234-5678" 
                                    value="${escapeHTML(user.phone || '')}">
                                <button type="submit" class="btn btn-primary btn-sm" style="white-space:nowrap; height:32px; padding:0 12px;">
                                    💾 บันทึก
                                </button>
                            </div>
                        </div>

                        <!-- Organization / Academic details -->
                        <div style="margin-top:14px; font-size:0.92rem; color:var(--text-secondary); line-height:1.6;">
                            🏢 <strong>คณะ:</strong> ${escapeHTML(user.faculty || '-')} &nbsp;|&nbsp; 
                            <strong>สาขาวิชา/หน่วยงาน:</strong> ${escapeHTML(user.department || '-')}
                            ${isStudent ? ` &nbsp;|&nbsp; <strong>ชั้นปี:</strong> ${escapeHTML(getStudentYear(user) || '-')}` : ''}
                        </div>

                        ${user.bio ? `
                            <p style="margin-top:12px; font-size:0.9rem; color:var(--text-primary); background:var(--bg-subtle); padding:10px 14px; border-radius:var(--radius-sm); border-left:3px solid var(--primary);">
                                ${escapeHTML(user.bio)}
                            </p>
                        ` : ''}

                        ${(user.skills || []).length > 0 ? `
                        <!-- Skills Section -->
                        <div style="margin-top:16px;">
                            <div style="font-size:0.85rem; font-weight:700; margin-bottom:8px; color:var(--primary-dark);">
                                🎯 ทักษะและความสามารถ (Skills):
                            </div>
                            <div class="skills-list">
                                ${(user.skills || []).map(s => `
                                    <span class="skill-tag matched">${escapeHTML(s)}</span>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}

                        ${user.interests ? `
                            <div style="margin-top:10px; font-size:0.85rem; color:var(--text-secondary);">
                                💡 <strong>ความสนใจพิเศษ:</strong> ${escapeHTML(user.interests)}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </form>
        </div>

        ${isStudent ? `
            <!-- Portfolio Section -->
            <div style="margin-bottom:32px;">
                <div class="section-header" style="margin-bottom:14px;">
                    <div>
                        <h2 class="section-title" style="font-size:1.25rem;">
                            <span>🎨 แฟ้มสะสมผลงาน (Portfolio)</span>
                            <span class="section-counter">(${portfolios.length} ชิ้นงาน)</span>
                        </h2>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="window.linkUApp.openPortfolioAddModal()">
                        ➕ เพิ่มผลงานใหม่
                    </button>
                </div>

                ${portfolios.length === 0 ? `
                    <div class="empty-state" style="padding:36px;">
                        <div class="empty-icon">📁</div>
                        <h4 class="empty-title">ยังไม่มีผลงานใน Portfolio</h4>
                        <p class="empty-text">เพิ่มรูปภาพ ลิงก์ และคำอธิบายผลงานเพื่อให้อาจารย์เห็นผลงานจริงของคุณ</p>
                        <button class="btn btn-primary btn-sm" onclick="window.linkUApp.openPortfolioAddModal()">
                            ➕ เพิ่มผลงานแรก
                        </button>
                    </div>
                ` : `
                    <div class="portfolio-grid">
                        ${portfolios.map(p => `
                            <div class="portfolio-card">
                                ${p.image_url ? `
                                    <img src="${p.image_url}" alt="${escapeHTML(p.title)}" class="portfolio-img">
                                ` : `
                                    <div class="portfolio-img" style="display:flex; align-items:center; justify-content:center; font-size:2rem; color:var(--text-muted);">
                                        📁
                                    </div>
                                `}
                                <div class="portfolio-body">
                                    <span class="portfolio-category">${escapeHTML(p.category || 'General')}</span>
                                    <h4 class="portfolio-title">${escapeHTML(p.title)}</h4>
                                    <p class="portfolio-desc">${escapeHTML(p.description || '')}</p>
                                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:auto; padding-top:8px;">
                                        ${p.project_url ? `
                                            <a href="${escapeHTML(p.project_url)}" target="_blank" class="btn btn-outline btn-sm" style="font-size:0.75rem;">
                                                🔗 เปิดดูผลงาน
                                            </a>
                                        ` : '<span></span>'}
                                        <button class="btn btn-danger btn-sm" style="padding:3px 8px; font-size:0.75rem;" onclick="window.linkUApp.deletePortfolioItem('${p.id}')">
                                            ลบ
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>

            <!-- Reviews & Ratings Section -->
            <div>
                <div class="section-header" style="margin-bottom:14px;">
                    <div>
                        <h2 class="section-title" style="font-size:1.25rem;">
                            <span>⭐ ประวัติการประเมินและรีวิวจากอาจารย์</span>
                            <span class="section-counter">(${reviews.length} รีวิว)</span>
                        </h2>
                    </div>
                </div>

                ${reviews.length === 0 ? `
                    <div class="empty-state" style="padding:36px;">
                        <div class="empty-icon">🎖️</div>
                        <h4 class="empty-title">ยังไม่มีประวัติการประเมิน</h4>
                        <p class="empty-text">เมื่ออาจารย์ให้คะแนนและรีวิวหลังเสร็จสิ้นโครงการ ผลการประเมินจะแสดงที่นี่เพื่อเพิ่มความน่าเชื่อถือ</p>
                    </div>
                ` : `
                    <div class="reviews-grid">
                        ${reviews.map(r => `
                            <div class="review-card">
                                <div class="review-header">
                                    <div class="review-stars">${'⭐'.repeat(r.rating || 5)}</div>
                                    <span style="font-size:0.75rem; color:var(--text-muted);">${formatDate(r.created_at)}</span>
                                </div>
                                <div style="font-weight:700; font-size:0.92rem; color:var(--text-primary); margin-bottom:4px;">
                                    โครงการ: ${escapeHTML(r.job_title || 'โครงการในมหาวิทยาลัย')}
                                </div>
                                <p class="review-comment">"${escapeHTML(r.comment || 'ผลงานยอดเยี่ยม มีความรับผิดชอบดีมาก')}"</p>
                                <div class="review-author">
                                    โดย: <strong>${escapeHTML(r.instructor_name)}</strong>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        ` : ''}
    `;
}

// =========================================================================
// VIEW: 8. Analytics Dashboard (Requirement 8)
// =========================================================================
async function renderDashboardView() {
    const container = document.getElementById('viewContainer');
    const instructorId = AppState.currentUser.id;
    const jobs = await DB.getJobs({ created_by: instructorId });
    const jobIds = new Set(jobs.map(job => job.id));
    const applications = (await DB.getApplications()).filter(app => jobIds.has(app.job_id));
    const reviews = (await DB.getAllReviews()).filter(review =>
        review.instructor_id === instructorId || jobIds.has(review.job_id)
    );
    const skillCounts = {};
    jobs.forEach(job => (job.required_skills || []).forEach(skill => {
        const key = skill.trim();
        if (key) skillCounts[key] = (skillCounts[key] || 0) + 1;
    }));
    const stats = {
        totalJobs: jobs.length,
        activeJobs: jobs.filter(job => job.status === 'open').length,
        totalApplicants: applications.length,
        pendingCount: applications.filter(app => app.status === 'pending').length,
        approvedCount: applications.filter(app => app.status === 'approved').length,
        inProgressCount: applications.filter(app => app.status === 'in_progress').length,
        completedCount: applications.filter(app => app.status === 'completed').length,
        topSkills: Object.entries(skillCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count })),
        totalReviews: reviews.length,
        avgRating: reviews.length
            ? (reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0) / reviews.length).toFixed(1)
            : '0.0'
    };

    container.innerHTML = `
        <div class="section-header">
            <div>
                <h1 class="section-title">
                    <span>📊 Dashboard อาจารย์: ภาพรวมโครงการของฉัน</span>
                </h1>
                <p style="font-size:0.88rem; color:var(--text-secondary); margin-top:4px;">
                    สถิติโครงการและผู้สมัครที่เกี่ยวข้องกับประกาศของคุณ
                </p>
            </div>
            <button class="btn btn-outline" onclick="window.linkUApp.renderDashboardView()">
                🔄 รีเฟรชข้อมูล
            </button>
        </div>

        <!-- Metric Summary Cards -->
        <div class="dashboard-metrics">
            <button type="button" class="metric-card metric-card-action" onclick="window.linkUApp.navigateTo('manage-jobs')" aria-label="ดูโครงการของฉัน">
                <div class="metric-icon-wrap blue">📢</div>
                <div class="metric-data">
                    <span class="metric-number">${stats.totalJobs}</span>
                    <span class="metric-label">โครงการของฉัน (เปิดรับ: ${stats.activeJobs})</span>
                </div>
            </button>

            <button type="button" class="metric-card metric-card-action" onclick="window.linkUApp.navigateToApplicants('all')" aria-label="ดูผู้สมัครในโครงการของฉัน">
                <div class="metric-icon-wrap amber">👥</div>
                <div class="metric-data">
                    <span class="metric-number">${stats.totalApplicants}</span>
                    <span class="metric-label">ผู้สมัครในโครงการของฉัน</span>
                </div>
            </button>

            <div class="metric-card">
                <div class="metric-icon-wrap green">🚀</div>
                <div class="metric-data">
                    <span class="metric-number">${stats.inProgressCount + stats.completedCount}</span>
                    <span class="metric-label">ผู้สมัครที่อยู่ระหว่างดำเนินงาน/เสร็จสิ้น</span>
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-icon-wrap purple">⭐</div>
                <div class="metric-data">
                    <span class="metric-number">${stats.avgRating} / 5.0</span>
                    <span class="metric-label">คะแนนรีวิวเฉลี่ย (${stats.totalReviews} รีวิว)</span>
                </div>
            </div>
        </div>

        <div class="dashboard-sections-grid">
            <!-- Skill Demand Chart -->
            <div class="dashboard-panel">
                <h3 class="panel-title">
                    <span>🔥 ทักษะที่เป็นที่ต้องการสูงสุด (Top Demanded Skills)</span>
                </h3>
                <div style="margin-top:14px;">
                    ${stats.topSkills.length === 0 ? `
                        <div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">ยังไม่มีข้อมูลทักษะในระบบ</div>
                    ` : stats.topSkills.map(s => {
        const pct = Math.min(100, Math.round((s.count / Math.max(1, stats.totalJobs)) * 100));
        return `
                            <div class="skill-bar-row">
                                <div class="skill-bar-labels">
                                    <span>${escapeHTML(s.name)}</span>
                                    <span>${s.count} โครงการ (${pct}%)</span>
                                </div>
                                <div class="skill-bar-track">
                                    <div class="skill-bar-fill" style="width: ${pct}%;"></div>
                                </div>
                            </div>
                        `;
    }).join('')}
                </div>
            </div>

            <!-- Application Pipeline Breakdown -->
            <div class="dashboard-panel">
                <h3 class="panel-title">
                    <span>📈 สถานะการดำเนินงาน (Application Pipeline)</span>
                </h3>
                <div style="display:flex; flex-direction:column; gap:14px; margin-top:14px;">
                    <button type="button" class="dashboard-pipeline-link" style="background:var(--warning-light);" onclick="window.linkUApp.navigateToApplicants('pending')">
                        <span>⏳ รอพิจารณา (Pending)</span>
                        <strong>${stats.pendingCount} คน</strong>
                    </button>
                    <button type="button" class="dashboard-pipeline-link" style="background:var(--success-light);" onclick="window.linkUApp.navigateToApplicants('approved')">
                        <span>✅ ได้รับการอนุมัติ (Approved)</span>
                        <strong>${stats.approvedCount} คน</strong>
                    </button>
                    <button type="button" class="dashboard-pipeline-link" style="background:var(--primary-light);" onclick="window.linkUApp.navigateToApplicants('in_progress')">
                        <span>🚀 กำลังดำเนินงาน (In Progress)</span>
                        <strong>${stats.inProgressCount} คน</strong>
                    </button>
                    <button type="button" class="dashboard-pipeline-link" style="background:var(--info-light);" onclick="window.linkUApp.navigateToApplicants('completed')">
                        <span>🏆 เสร็จสิ้นโครงการ (Completed)</span>
                        <strong>${stats.completedCount} คน</strong>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// =========================================================================
// MODALS & ACTIONS
// =========================================================================

// Open Job Editor Modal (Create or Edit)
export async function openJobEditorModal(jobId = null) {
    const modal = document.getElementById('jobEditorModal');
    const title = document.getElementById('jobEditorModalTitle');
    const form = document.getElementById('jobEditorForm');

    form.reset();
    document.getElementById('deadlineCalendar').hidden = true;
    document.getElementById('jobEditId').value = jobId || '';

    if (jobId) {
        title.textContent = '✏️ แก้ไขประกาศงาน / โครงการ';
        const job = await DB.getJob(jobId);
        if (job) {
            document.getElementById('jobTitleInput').value = job.title || '';
            document.getElementById('jobDeptInput').value = job.department || '';
            document.getElementById('jobDescInput').value = job.description || '';
            document.getElementById('jobSkillsInput').value = (job.required_skills || []).join(', ');
            const stipendFormData = parseStipendForForm(job);
            document.getElementById('jobStipendInput').value = stipendFormData.amount;
            document.getElementById('jobStipendUnitInput').value = stipendFormData.unit || 'วัน';
            document.getElementById('jobLegacyStipendInput').value = stipendFormData.legacy;
            document.getElementById('jobLegacyStipendUnitInput').value = stipendFormData.legacyUnit;
            document.getElementById('jobActivityHoursInput').value = job.activity_hours ?? '';
            document.getElementById('jobActivityScopeInput').value = job.activity_scope || 'มหาลัย';
            document.getElementById('jobBenefitsInput').value = job.benefits || '';
            document.getElementById('jobPositionsInput').value = job.positions || 1;
            document.getElementById('jobDurationInput').value = job.duration || '';
            document.getElementById('jobDeadlineInput').value = toBuddhistDate(job.deadline);
            document.getElementById('jobLocationInput').value = job.location || 'มหาวิทยาลัยแม่โจ้';
        }
    } else {
        title.textContent = '➕ ประกาศงาน / โครงการใหม่';
        document.getElementById('jobDeptInput').value = [AppState.currentUser.faculty, AppState.currentUser.department].filter(Boolean).join(' / ');
        document.getElementById('jobLocationInput').value = 'มหาวิทยาลัยแม่โจ้';
    }

    openModal('jobEditorModal');
}

export async function openJobDetailModal(jobId) {
    const job = await DB.getJob(jobId);
    if (!job) return;

    const modalBody = document.getElementById('jobDetailModalBody');
    const isStudent = AppState.currentUser?.role === 'student';
    const match = isStudent ? MatchingEngine.calculateMatch(AppState.currentUser, job) : null;

    modalBody.innerHTML = `
        <div style="margin-bottom:14px;">
            <span class="job-dept-badge">🏢 ${escapeHTML(job.department)}</span>
            <span class="job-status-pill ${job.status}" style="margin-left:6px;">
                ${job.status === 'open' ? '🟢 เปิดรับสมัคร' : '🔴 ปิดรับสมัครแล้ว'}
            </span>
        </div>

        <h2 style="font-size:1.35rem; font-weight:800; margin-bottom:8px;">${escapeHTML(job.title)}</h2>
        <div style="font-size:0.88rem; color:var(--text-secondary); margin-bottom:16px;">
            อาจารย์/หน่วยงานผู้รับผิดชอบ: <strong>${escapeHTML(job.instructor_name)}</strong>
        </div>

        <div class="job-meta-row" style="margin-bottom:18px;">
            ${job.compensation ? `<span class="job-meta-item stipend">💰 ค่าตอบแทน: ${escapeHTML(job.compensation)}</span>` : ''}
            ${job.stipend ? `<span class="job-meta-item stipend">🧾 เบี้ยเลี้ยง: ${escapeHTML(formatJobStipend(job))}</span>` : ''}
            ${job.activity_hours !== null && job.activity_hours !== undefined ? `<span class="job-meta-item">🎓 ชั่วโมงกิจกรรม: ${escapeHTML(String(job.activity_hours))} ชม. (${escapeHTML(job.activity_scope || 'มหาลัย')})</span>` : ''}
            ${job.benefits ? `<span class="job-meta-item">✨ สิทธิประโยชน์อื่นๆ: ${escapeHTML(job.benefits)}</span>` : ''}
            <span class="job-meta-item">👥 รับ: ${job.positions} ตำแหน่ง</span>
            ${job.duration ? `<span class="job-meta-item">⏱️ ระยะเวลา: ${escapeHTML(job.duration)}</span>` : ''}
            <span class="job-meta-item">📍 สถานที่: ${escapeHTML(job.location || 'มหาวิทยาลัยแม่โจ้')}</span>
            ${job.deadline ? `<span class="job-meta-item">📅 ปิดรับสมัคร: ${formatDate(job.deadline)}</span>` : ''}
        </div>

        ${isStudent && match ? `
            <div class="matching-banner" style="margin-bottom:18px;">
                <span class="matching-score-badge">
                    <span>🎯 ความเหมาะสมกับคุณ:</span>
                    <strong>${match.score}%</strong>
                </span>
                <div class="matching-bar-wrap">
                    <div class="matching-bar-fill" style="width:${match.score}%;"></div>
                </div>
                <span>${match.matchLevel}</span>
            </div>
        ` : ''}

        <div style="margin-bottom:18px;">
            <h4 style="font-size:0.95rem; font-weight:700; margin-bottom:6px;">รายละเอียดและขอบเขตงาน:</h4>
            <div style="font-size:0.92rem; line-height:1.6; color:var(--text-secondary); white-space:pre-line;">
                ${escapeHTML(job.description)}
            </div>
        </div>

        <div>
            <h4 style="font-size:0.95rem; font-weight:700; margin-bottom:8px;">ทักษะที่ต้องการ (Required Skills):</h4>
            <div class="skills-list">
                ${(job.required_skills || []).map(skill => {
        const isMatched = isStudent && match?.matchedSkills.includes(skill);
        return `<span class="skill-tag ${isMatched ? 'matched' : ''}">${isMatched ? '✓ ' : ''}${escapeHTML(skill)}</span>`;
    }).join('')}
            </div>
        </div>
    `;

    const applyActionBtn = document.getElementById('jobDetailApplyBtn');
    if (applyActionBtn) {
        if (isStudent && job.status === 'open') {
            applyActionBtn.style.display = 'inline-flex';
            applyActionBtn.onclick = () => {
                closeModal('jobDetailModal');
                openApplyModal(job.id);
            };
        } else {
            applyActionBtn.style.display = 'none';
        }
    }

    openModal('jobDetailModal');
}

export async function openApplyModal(jobId) {
    if (AppState.currentUser?.role !== 'student') {
        showToast('เฉพาะนักศึกษาเท่านั้นที่สามารถสมัครงานได้', 'error');
        return;
    }

    const job = await DB.getJob(jobId);
    if (!job) return;

    const existingApplications = await DB.getApplications({
        student_id: AppState.currentUser.id,
        job_id: jobId
    });
    if (existingApplications.length) {
        AppState.applications = [
            ...AppState.applications.filter(app => !(app.student_id === AppState.currentUser.id && app.job_id === jobId)),
            ...existingApplications
        ];
        updateApplyButtonState(jobId, 'applied');
        showToast('คุณสมัครงานตำแหน่งนี้ไปแล้ว', 'info');
        return;
    }

    document.getElementById('applyJobId').value = jobId;
    document.getElementById('applyJobTitleDisplay').textContent = job.title;
    document.getElementById('applyDeptDisplay').textContent = job.department;
    clearApplyFile();

    const match = MatchingEngine.calculateMatch(AppState.currentUser, job);
    document.getElementById('applyMatchScoreDisplay').textContent = `${match.score}% (${match.matchLevel})`;

    openModal('applyModal');
}

export function openProfileEditModal() {
    const user = AppState.currentUser;
    if (!user) return;
    const hideInstructorFields = user.role === 'instructor';
    ['profileSkillsGroup', 'profileInterestsGroup', 'profileBioGroup'].forEach(id => {
        document.getElementById(id).hidden = hideInstructorFields;
    });
    document.getElementById('profileNameInput').value = user.full_name || '';
    document.getElementById('profileFacultyInput').value = user.faculty || '';
    document.getElementById('profileDeptInput').value = user.department || '';
    document.getElementById('profileYearInput').value = user.role === 'student'
        ? getStudentYear(user)
        : user.year_level || '';
    document.getElementById('profilePhoneInput').value = user.phone || '';
    document.getElementById('profileBioInput').value = user.bio || '';
    document.getElementById('profileSkillsInput').value = (user.skills || []).join(', ');
    document.getElementById('profileInterestsInput').value = user.interests || '';
    modalAvatarDataUrl = '';

    const preview = document.getElementById('modalAvatarPreview');
    if (preview) {
        if (user.avatar_url) {
            preview.innerHTML = `<img src="${user.avatar_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        } else {
            preview.textContent = user.full_name ? user.full_name.charAt(0) : '👤';
        }
    }

    openModal('profileEditModal');
}

export function openPortfolioAddModal() {
    document.getElementById('portfolioAddForm').reset();
    openModal('portfolioAddModal');
}

export function openReviewModal(applicationId, studentId, studentName, jobId, jobTitle) {
    document.getElementById('reviewAppId').value = applicationId;
    document.getElementById('reviewStudentId').value = studentId;
    document.getElementById('reviewJobId').value = jobId;
    document.getElementById('reviewJobTitle').value = jobTitle;
    document.getElementById('reviewStudentNameDisplay').textContent = studentName;
    document.getElementById('reviewRatingInput').value = '5';
    document.getElementById('reviewCommentInput').value = '';

    // Update star visual
    renderStarRating(5);

    openModal('reviewModal');
}

function renderStarRating(rating) {
    document.querySelectorAll('#starRatingGroup .star').forEach(star => {
        const val = parseInt(star.getAttribute('data-value'), 10);
        if (val <= rating) {
            star.classList.add('filled');
        } else {
            star.classList.remove('filled');
        }
    });
}

export function openChatWithUser(otherUserId, otherUserName, jobId, jobTitle) {
    AppState.activeChat = {
        jobId: jobId,
        jobTitle: jobTitle,
        otherUser: { id: otherUserId, full_name: otherUserName }
    };
    navigateTo('chat');
}

export function selectChatConversation(otherUserId, otherUserName, jobId, jobTitle) {
    AppState.activeChat = {
        jobId: jobId,
        jobTitle: jobTitle,
        otherUser: { id: otherUserId, full_name: otherUserName }
    };
    renderChatView();
}

// 8. Form Listeners & Submissions
function setupFormListeners() {
    // Star rating click handler
    document.querySelectorAll('#starRatingGroup .star').forEach(star => {
        star.addEventListener('click', () => {
            const val = parseInt(star.getAttribute('data-value'), 10);
            document.getElementById('reviewRatingInput').value = val;
            renderStarRating(val);
        });
    });

    // Save Job Form
    const jobEditorForm = document.getElementById('jobEditorForm');
    if (jobEditorForm) {
        jobEditorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const jobId = document.getElementById('jobEditId').value;
            const skillsStr = document.getElementById('jobSkillsInput').value;
            const skillsArr = skillsStr.split(',').map(s => s.trim()).filter(Boolean);
            const stipendInput = document.getElementById('jobStipendInput').value.trim();
            const activityHoursInput = document.getElementById('jobActivityHoursInput').value.trim();
            if ((stipendInput && (!Number.isFinite(Number(stipendInput)) || Number(stipendInput) < 0)) ||
                (activityHoursInput && (!Number.isSafeInteger(Number(activityHoursInput)) || Number(activityHoursInput) < 0))) {
                showToast('เบี้ยเลี้ยงต้องเป็นตัวเลข และชั่วโมงกิจกรรมต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป', 'error');
                return;
            }

            const deadlineInput = document.getElementById('jobDeadlineInput').value.trim();
            const deadline = deadlineInput ? parseBuddhistDate(deadlineInput) : null;
            if (deadlineInput && !deadline) {
                showToast('กรุณาระบุวันปิดรับสมัครเป็น พ.ศ. ในรูปแบบ YYYY-MM-DD', 'error');
                return;
            }
            const jobData = {
                title: document.getElementById('jobTitleInput').value.trim(),
                department: document.getElementById('jobDeptInput').value.trim(),
                description: document.getElementById('jobDescInput').value.trim(),
                required_skills: skillsArr,
                stipend: stipendInput || document.getElementById('jobLegacyStipendInput').value,
                stipend_unit: stipendInput
                    ? document.getElementById('jobStipendUnitInput').value
                    : document.getElementById('jobLegacyStipendUnitInput').value || null,
                activity_hours: activityHoursInput === ''
                    ? null
                    : Number(activityHoursInput),
                activity_scope: document.getElementById('jobActivityScopeInput').value,
                benefits: document.getElementById('jobBenefitsInput').value.trim(),
                positions: parseInt(document.getElementById('jobPositionsInput').value, 10) || 1,
                duration: document.getElementById('jobDurationInput').value.trim(),
                deadline,
                location: document.getElementById('jobLocationInput').value.trim() || 'มหาวิทยาลัยแม่โจ้',
                created_by: AppState.currentUser.id,
                instructor_name: AppState.currentUser.full_name
            };

            try {
                AppState.currentUser = await DB.upsertProfile(AppState.currentUser, { strict: true });
                if (jobId) {
                    await DB.updateJob(jobId, jobData);
                    showToast('บันทึกการแก้ไขประกาศงานเรียบร้อย', 'success');
                } else {
                    await DB.createJob(jobData);
                    showToast('ประกาศงานใหม่สำเร็จ บันทึกลง Supabase แล้ว', 'success');
                }
            } catch (error) {
                console.error('Job save failed:', error);
                const message = /compensation/i.test(error.message || '')
                    ? 'ตาราง jobs ยังไม่มี compensation ให้รัน: ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS compensation TEXT; แล้วรีเฟรชหน้า'
                    : /(stipend_unit|activity_hours|activity_scope|benefits)/i.test(error.message || '')
                        ? 'ตาราง jobs ยังไม่มีช่องข้อมูลกิจกรรม กรุณารัน migration ล่าสุดใน schema.sql ที่ Supabase SQL Editor แล้วรีเฟรชหน้า'
                    : /jobs_created_by_fkey/i.test(error.message || '')
                        ? 'ไม่พบบัญชีผู้ประกาศใน Supabase กรุณาเข้าสู่ระบบ/สมัครบัญชีอาจารย์ใหม่หลังตั้งค่า Supabase'
                    : `บันทึกงานไม่สำเร็จ: ${error.message || 'ตรวจสอบการตั้งค่าและสิทธิ์ Supabase'}`;
                showToast(message, 'error');
                return;
            }

            closeModal('jobEditorModal');
            renderCurrentView();
        });
    }

    // Submit Application Form
    const applyForm = document.getElementById('applyForm');
    if (applyForm) {
        applyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = applyForm.querySelector('button[type="submit"]');
            if (submitButton?.disabled) return;
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'กำลังส่งใบสมัคร...';
            }
            const jobId = document.getElementById('applyJobId').value;
            const existingApplications = await DB.getApplications({
                student_id: AppState.currentUser.id,
                job_id: jobId
            });
            if (existingApplications.length) {
                AppState.applications = [
                    ...AppState.applications.filter(app => !(app.student_id === AppState.currentUser.id && app.job_id === jobId)),
                    ...existingApplications
                ];
                updateApplyButtonState(jobId, 'applied');
                showToast('คุณสมัครงานตำแหน่งนี้ไปแล้ว', 'info');
                closeModal('applyModal');
                return;
            }
            const job = await DB.getJob(jobId);
            const match = MatchingEngine.calculateMatch(AppState.currentUser, job);
            let attachment = {};
            if (selectedApplicationFile) {
                try {
                    attachment = await DB.uploadApplicationAttachment(selectedApplicationFile, AppState.currentUser.id);
                } catch (error) {
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.textContent = 'ยืนยันการสมัครงาน';
                    }
                    showToast(error.message || 'ไม่สามารถอัปโหลดไฟล์ประกอบได้', 'error');
                    return;
                }
            }

            const appData = {
                job_id: jobId,
                student_id: AppState.currentUser.id,
                student_name: AppState.currentUser.full_name,
                student_email: AppState.currentUser.email,
                student_faculty: AppState.currentUser.faculty,
                message: document.getElementById('applyMessageInput').value.trim(),
                portfolio_link: document.getElementById('applyPortfolioInput').value.trim(),
                ...attachment,
                matching_score: match.score,
                matched_skills: match.matchedSkills,
                status: 'pending'
            };

            let savedApplication;
            try {
                savedApplication = await DB.createApplication(appData, { strict: true });
            } catch (error) {
                if (error.code === '23505') {
                    const latestApplications = await DB.getApplications({
                        student_id: AppState.currentUser.id,
                        job_id: jobId
                    });
                    AppState.applications = [...AppState.applications, ...latestApplications];
                    updateApplyButtonState(jobId, 'applied');
                    showToast('คุณสมัครงานตำแหน่งนี้ไปแล้ว', 'info');
                    closeModal('applyModal');
                    return;
                }
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'ยืนยันการสมัครงาน';
                }
                showToast(`บันทึกใบสมัครไม่สำเร็จ: ${error.message || 'โปรดลองอีกครั้ง'}`, 'error');
                return;
            }

            AppState.applications = [
                ...AppState.applications.filter(app => !(app.student_id === savedApplication.student_id && app.job_id === savedApplication.job_id)),
                savedApplication
            ];
            updateApplyButtonState(jobId, 'applied');
            selectedApplicationFile = null;
            showToast('ส่งใบสมัครเรียบร้อยแล้ว! อาจารย์ผู้รับผิดชอบจะได้รับการแจ้งเตือน', 'success');
            closeModal('applyModal');
        });
    }

    // Save Profile Form
    const profileEditForm = document.getElementById('profileEditForm');
    if (profileEditForm) {
        profileEditForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const skillsStr = document.getElementById('profileSkillsInput').value;
            const skillsArr = skillsStr.split(',').map(s => s.trim()).filter(Boolean);

            const updatedProfile = {
                ...AppState.currentUser,
                full_name: document.getElementById('profileNameInput').value.trim(),
                faculty: document.getElementById('profileFacultyInput').value.trim(),
                department: document.getElementById('profileDeptInput').value.trim(),
                year_level: document.getElementById('profileYearInput').value.trim(),
                student_year: AppState.currentUser.role === 'student'
                    ? document.getElementById('profileYearInput').value.trim()
                    : AppState.currentUser.student_year,
                phone: document.getElementById('profilePhoneInput').value.trim(),
                bio: AppState.currentUser.role === 'instructor'
                    ? AppState.currentUser.bio
                    : document.getElementById('profileBioInput').value.trim(),
                skills: AppState.currentUser.role === 'instructor'
                    ? AppState.currentUser.skills
                    : skillsArr,
                interests: AppState.currentUser.role === 'instructor'
                    ? AppState.currentUser.interests
                    : document.getElementById('profileInterestsInput').value.trim(),
                avatar_url: modalAvatarDataUrl || AppState.currentUser.avatar_url || ''
            };

            AppState.currentUser = await DB.upsertProfile(updatedProfile);
            showToast('อัปเดตข้อมูลโปรไฟล์เรียบร้อย', 'success');
            closeModal('profileEditModal');
            renderHeader();
            renderProfileView();
        });
    }

    // Add Portfolio Form
    const portfolioAddForm = document.getElementById('portfolioAddForm');
    if (portfolioAddForm) {
        portfolioAddForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const item = {
                user_id: AppState.currentUser.id,
                title: document.getElementById('portfolioTitleInput').value.trim(),
                category: document.getElementById('portfolioCategoryInput').value.trim(),
                description: document.getElementById('portfolioDescInput').value.trim(),
                project_url: document.getElementById('portfolioUrlInput').value.trim(),
                image_url: document.getElementById('portfolioImgInput').value.trim()
            };

            await DB.createPortfolio(item);
            showToast('เพิ่มผลงานลงในแฟ้มผลงานสำเร็จ', 'success');
            closeModal('portfolioAddModal');
            renderProfileView();
        });
    }

    // Submit Review Form
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const reviewData = {
                application_id: document.getElementById('reviewAppId').value,
                student_id: document.getElementById('reviewStudentId').value,
                job_id: document.getElementById('reviewJobId').value,
                job_title: document.getElementById('reviewJobTitle').value,
                instructor_id: AppState.currentUser.id,
                instructor_name: AppState.currentUser.full_name,
                rating: parseInt(document.getElementById('reviewRatingInput').value, 10) || 5,
                comment: document.getElementById('reviewCommentInput').value.trim()
            };

            await DB.createReview(reviewData);
            showToast('บันทึกการประเมินและให้คะแนนนักศึกษาเรียบร้อย', 'success');
            closeModal('reviewModal');
            renderCurrentView();
        });
    }

    // Supabase Config Form
    const supabaseForm = document.getElementById('supabaseConfigForm');
    if (supabaseForm) {
        // Pre-fill current config
        const currentCfg = SupabaseConfig.getConfig();
        if (currentCfg.url) document.getElementById('supabaseUrlInput').value = currentCfg.url;
        if (currentCfg.key) document.getElementById('supabaseKeyInput').value = currentCfg.key;

        supabaseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const url = document.getElementById('supabaseUrlInput').value.trim();
            const key = document.getElementById('supabaseKeyInput').value.trim();

            SupabaseConfig.saveConfig(url, key);
            showToast('บันทึกการตั้งค่า Supabase เรียบร้อย กำลังทดสอบการเชื่อมต่อ...', 'info');

            await checkSupabaseHealth();
            if (AppState.supabaseStatus.connected) {
                showToast('🟢 เชื่อมต่อ Supabase สำเร็จ พร้อมใช้งาน!', 'success');
            } else {
                showToast(`⚠️ ${AppState.supabaseStatus.message}`, 'error');
            }
            closeModal('supabaseConfigModal');
        });
    }
}

export function validatePasswordStrength(input) {
    const password = typeof input === 'string' ? input : input?.value || '';
    const valid = password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
    const message = document.getElementById('passwordStrengthMsg');
    if (message) {
        message.textContent = valid ? 'รหัสผ่านผ่านเงื่อนไข' : 'ต้องมีอย่างน้อย 8 ตัว พร้อมตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข';
        message.style.color = valid ? 'var(--success)' : 'var(--danger)';
    }
    if (typeof input !== 'string' && input?.setCustomValidity) {
        input.setCustomValidity(password && !valid ? 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ตัวเลข และอย่างน้อย 8 ตัว' : '');
    }
    return valid;
}

export function handleDeadlineBEInput(input) {
    const value = input.value.trim();
    const valid = !value || Boolean(parseBuddhistDate(value));
    input.setCustomValidity(valid ? '' : 'วันที่ต้องเป็น พ.ศ. รูปแบบ YYYY-MM-DD และเป็นวันที่จริง');
}

export function toggleDeadlineCalendar() {
    const picker = document.getElementById('deadlineCalendar');
    const input = document.getElementById('jobDeadlineInput');
    if (!picker || !input) return;

    picker.hidden = !picker.hidden;
    if (!picker.hidden) {
        const selected = parseBuddhistDate(input.value.trim());
        const [year, month] = selected ? selected.split('-').map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1];
        deadlinePickerDate = new Date(year, month - 1, 1);
        renderDeadlineCalendar();
    }
}

export function shiftDeadlineCalendar(monthDelta) {
    deadlinePickerDate = new Date(deadlinePickerDate.getFullYear(), deadlinePickerDate.getMonth() + monthDelta, 1);
    renderDeadlineCalendar();
}

export function setDeadlineCalendarMonth(month) {
    deadlinePickerDate = new Date(deadlinePickerDate.getFullYear(), Number(month), 1);
    renderDeadlineCalendar();
}

export function setDeadlineCalendarYear(buddhistYear) {
    deadlinePickerDate = new Date(Number(buddhistYear) - 543, deadlinePickerDate.getMonth(), 1);
    renderDeadlineCalendar();
}

export function selectDeadlineCalendarDay(day) {
    const date = new Date(deadlinePickerDate.getFullYear(), deadlinePickerDate.getMonth(), Number(day));
    const year = date.getFullYear() + 543;
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dayText = String(date.getDate()).padStart(2, '0');
    const input = document.getElementById('jobDeadlineInput');
    input.value = `${year}-${month}-${dayText}`;
    handleDeadlineBEInput(input);
    document.getElementById('deadlineCalendar').hidden = true;
}

function renderDeadlineCalendar() {
    const picker = document.getElementById('deadlineCalendar');
    if (!picker) return;

    const year = deadlinePickerDate.getFullYear();
    const month = deadlinePickerDate.getMonth();
    const buddhistYear = year + 543;
    const currentBuddhistYear = new Date().getFullYear() + 543;
    const rangeStart = Math.min(currentBuddhistYear - 5, buddhistYear - 5);
    const rangeEnd = Math.max(currentBuddhistYear + 15, buddhistYear + 5);
    const selectedDate = parseBuddhistDate(document.getElementById('jobDeadlineInput').value.trim());
    const selectedParts = selectedDate?.split('-').map(Number);
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];

    for (let index = 0; index < firstWeekday; index++) {
        cells.push('<span class="deadline-calendar-empty" aria-hidden="true"></span>');
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const isSelected = selectedParts && selectedParts[0] === year && selectedParts[1] === month + 1 && selectedParts[2] === day;
        const today = new Date();
        const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
        cells.push(`<button type="button" class="deadline-calendar-day${isSelected ? ' selected' : ''}${isToday ? ' today' : ''}" aria-label="${day} ${THAI_MONTH_NAMES[month]} ${buddhistYear}" onclick="window.linkUApp.selectDeadlineCalendarDay(${day})">${day}</button>`);
    }

    picker.innerHTML = `
        <div class="deadline-calendar-header">
            <button type="button" class="deadline-calendar-nav" aria-label="เดือนก่อน" onclick="window.linkUApp.shiftDeadlineCalendar(-1)">‹</button>
            <select class="deadline-calendar-select" aria-label="เลือกเดือน" onchange="window.linkUApp.setDeadlineCalendarMonth(this.value)">
                ${THAI_MONTH_NAMES.map((name, index) => `<option value="${index}" ${index === month ? 'selected' : ''}>${name}</option>`).join('')}
            </select>
            <select class="deadline-calendar-select" aria-label="เลือกปี พ.ศ." onchange="window.linkUApp.setDeadlineCalendarYear(this.value)">
                ${Array.from({ length: rangeEnd - rangeStart + 1 }, (_, index) => rangeStart + index).map(optionYear => `<option value="${optionYear}" ${optionYear === buddhistYear ? 'selected' : ''}>${optionYear} พ.ศ.</option>`).join('')}
            </select>
            <button type="button" class="deadline-calendar-nav" aria-label="เดือนถัดไป" onclick="window.linkUApp.shiftDeadlineCalendar(1)">›</button>
        </div>
        <div class="deadline-calendar-grid">
            ${THAI_WEEKDAY_NAMES.map(name => `<span class="deadline-calendar-weekday">${name}</span>`).join('')}
            ${cells.join('')}
        </div>
    `;
}

function parseBuddhistDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    if (!match) return null;
    const year = Number(match[1]) - 543;
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return `${year}-${match[2]}-${match[3]}`;
}

function toBuddhistDate(value) {
    if (!value) return '';
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    return match ? `${Number(match[1]) + 543}-${match[2]}-${match[3]}` : '';
}

function parseStipendForForm(job) {
    const stipend = String(job.stipend || '').trim();
    const unit = job.stipend_unit || '';
    const match = /^([\d,.]+)\s*(?:บาท)?(?:\s*(?:\/|ต่อ)\s*(วัน|สัปดาห์|เดือน|ปี|โครงการ))?$/.exec(stipend);
    if (!match) {
        return { amount: '', unit: unit || 'วัน', legacy: stipend, legacyUnit: unit };
    }
    return {
        amount: match[1].replace(/,/g, ''),
        unit: unit || match[2] || 'วัน',
        legacy: '',
        legacyUnit: ''
    };
}

function formatJobStipend(job) {
    const stipend = String(job.stipend || '').trim();
    if (!stipend) return '';
    if (/^[\d,.]+$/.test(stipend)) {
        return `${stipend} บาท${job.stipend_unit ? `/${job.stipend_unit}` : ''}`;
    }
    return stipend;
}

export function handleApplyFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowed = /\.(pdf|doc|docx|jpg|jpeg|png)$/i.test(file.name);
    if (!allowed || file.size > 5 * 1024 * 1024) {
        event.target.value = '';
        selectedApplicationFile = null;
        showToast('เลือกไฟล์ PDF, Word หรือรูปภาพ ขนาดไม่เกิน 5 MB', 'error');
        return;
    }
    selectedApplicationFile = file;
    document.getElementById('applyFileNameText').textContent = file.name;
    document.getElementById('applyFileNameDisplay').style.display = 'block';
}

export function clearApplyFile() {
    selectedApplicationFile = null;
    document.getElementById('applyFileInput').value = '';
    document.getElementById('applyFileNameDisplay').style.display = 'none';
    document.getElementById('applyFileNameText').textContent = '';
}

export async function openApplicationAttachment(path) {
    const url = await DB.getApplicationAttachmentUrl(path);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    else showToast('ไม่พบไฟล์แนบหรือไม่สามารถเปิดไฟล์ได้', 'error');
}

// 9. Status and Delete Actions
export async function changeApplicationStatus(appId, newStatus) {
    await DB.updateApplicationStatus(appId, newStatus);
    showToast(`อัปเดตสถานะใบสมัครเป็น: ${newStatus}`, 'success');
    renderCurrentView();
}

export async function toggleJobStatus(jobId, newStatus) {
    await DB.updateJob(jobId, { status: newStatus });
    showToast(`อัปเดตสถานะงานเป็น: ${newStatus === 'open' ? 'เปิดรับ' : 'ปิดรับแล้ว'}`, 'info');
    renderCurrentView();
}

export async function confirmDeleteJob(jobId) {
    if (confirm('คุณต้องการลบประกาศงานนี้ใช่หรือไม่? การลบจะไม่สามารถกู้คืนได้')) {
        await DB.deleteJob(jobId);
        showToast('ลบประกาศงานเรียบร้อย', 'success');
        renderCurrentView();
    }
}

export async function deletePortfolioItem(portfolioId) {
    if (confirm('ต้องการลบผลงานนี้ออกจาก Portfolio หรือไม่?')) {
        await DB.deletePortfolio(portfolioId);
        showToast('ลบผลงานเรียบร้อย', 'success');
        renderProfileView();
    }
}

// 10. Modal Utilities
export function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
}

export function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
}

// Toast Notification
export function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <span>${escapeHTML(message)}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 250);
    }, 3500);
}

// Formatters
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g,
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

function getStudentYear(profile) {
    const year = profile?.student_year || profile?.year_level || '';
    return year === 'นักศึกษา' ? '' : year;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return dateStr;
    }
}

function formatTime(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
}

// Auth Modal Handlers
export function openAuthModal() {
    switchAuthTab('login');
    selectRegisterRole(document.getElementById('registerRoleInput').value || 'student');
    registerAvatarDataUrl = '';
    const regPreview = document.getElementById('registerAvatarPreview');
    if (regPreview) regPreview.textContent = '👤';
    openModal('authModal');
}

export function switchAuthTab(tab) {
    const tabLogin = document.getElementById('tabAuthLogin');
    const tabRegister = document.getElementById('tabAuthRegister');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (tab === 'login') {
        tabLogin.style.fontWeight = '700';
        tabLogin.style.color = 'var(--primary)';
        tabLogin.style.borderBottom = '2px solid var(--primary)';
        tabRegister.style.fontWeight = '500';
        tabRegister.style.color = 'var(--text-secondary)';
        tabRegister.style.borderBottom = 'none';
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else {
        tabRegister.style.fontWeight = '700';
        tabRegister.style.color = 'var(--primary)';
        tabRegister.style.borderBottom = '2px solid var(--primary)';
        tabLogin.style.fontWeight = '500';
        tabLogin.style.color = 'var(--text-secondary)';
        tabLogin.style.borderBottom = 'none';
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    }
}

export function selectRegisterRole(role) {
    document.getElementById('registerRoleInput').value = role;
    const studentCard = document.getElementById('roleCardStudent');
    const instCard = document.getElementById('roleCardInstructor');
    const skillsGroup = document.getElementById('registerSkillsGroup');
    const bioGroup = document.getElementById('registerBioGroup');
    const studentYearGroup = document.getElementById('registerStudentYearGroup');
    const studentYearInput = document.getElementById('registerStudentYearInput');
    const emailInput = document.getElementById('registerEmailInput');
    const emailHint = document.getElementById('registerEmailHint');
    const nameInput = document.getElementById('registerNameInput');

    if (role === 'student') {
        studentCard.classList.add('selected');
        instCard.classList.remove('selected');
        if (skillsGroup) skillsGroup.style.display = 'block';
        if (bioGroup) bioGroup.style.display = 'block';
        if (studentYearGroup) studentYearGroup.style.display = 'block';
        if (studentYearInput) studentYearInput.required = true;
    } else {
        instCard.classList.add('selected');
        studentCard.classList.remove('selected');
        if (skillsGroup) skillsGroup.style.display = 'none';
        if (bioGroup) bioGroup.style.display = 'none';
        if (studentYearGroup) studentYearGroup.style.display = 'none';
        if (studentYearInput) {
            studentYearInput.required = false;
            studentYearInput.value = '';
        }
    }
    if (emailInput && emailHint) {
        emailInput.placeholder = role === 'student' ? 'mju6606105000@mju.ac.th' : '';
        emailHint.textContent = role === 'student' ? 'นักศึกษา: ใช้รูปแบบ mju6606105000@mju.ac.th' : '';
    }
    if (nameInput) nameInput.placeholder = role === 'student' ? 'เช่น นายสมชาย ใจดี' : '';
}

// Process and resize image file to Base64 JPEG
function processImageFile(file, maxWidth = 400, quality = 0.85) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            return reject(new Error('กรุณาเลือกไฟล์รูปภาพ'));
        }
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('เกิดข้อผิดพลาดในการอ่านไฟล์'));
        reader.onload = (e) => {
            const img = new Image();
            img.onerror = () => reject(new Error('ไม่สามารถประมวลผลรูปภาพได้'));
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxWidth) {
                        width = Math.round((width * maxWidth) / height);
                        height = maxWidth;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

export function handleLogout() {
    if (!confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) return;
    AppState.currentUser = null;
    localStorage.removeItem('linku_active_user_id');
    localStorage.setItem('linku_logged_out', 'true');
    showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
    renderHeader();
    navigateTo('jobs');
}

export async function handleDirectAvatarFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        showToast('กำลังประมวลผลรูปภาพ...', 'info');
        const dataUrl = await processImageFile(file);
        quickAvatarDataUrl = dataUrl;

        const preview = document.getElementById('quickAvatarPreview');
        if (preview) {
            preview.innerHTML = `<img src="${dataUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        }
        showToast('เลือกรูปภาพแล้ว กดปุ่ม "บันทึกรูปโปรไฟล์และเบอร์โทร" เพื่อยืนยัน', 'success');
    } catch (err) {
        showToast(err.message || 'ไม่สามารถโหลดรูปภาพได้', 'error');
    }
}

export async function handleModalAvatarFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
        const dataUrl = await processImageFile(file);
        modalAvatarDataUrl = dataUrl;

        const preview = document.getElementById('modalAvatarPreview');
        if (preview) {
            preview.innerHTML = `<img src="${dataUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        }
        showToast('อัปโหลดรูปภาพสำเร็จ', 'success');
    } catch (err) {
        showToast(err.message || 'ไม่สามารถโหลดรูปภาพได้', 'error');
    }
}

export async function handleQuickContactSave(e) {
    if (e) e.preventDefault();
    if (!AppState.currentUser) return;
    const phone = document.getElementById('directPhoneInput')?.value.trim() || '';

    const updated = {
        ...AppState.currentUser,
        phone: phone,
        avatar_url: quickAvatarDataUrl || AppState.currentUser.avatar_url || ''
    };

    AppState.currentUser = await DB.upsertProfile(updated);
    showToast('บันทึกรูปโปรไฟล์และเบอร์โทรศัพท์เรียบร้อยแล้ว', 'success');
    renderHeader();
    renderProfileView();
}

export async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmailInput').value.trim().toLowerCase();
    const password = document.getElementById('loginPasswordInput')?.value.trim() || '';
    const user = await DB.getProfileByEmail(email);

    if (user) {
        // Check password if set on profile and password was provided
        if (password && user.password && password !== user.password) {
            showToast('รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง', 'error');
            return;
        }

        AppState.currentUser = user;
        localStorage.setItem('linku_active_user_id', user.id);
        localStorage.removeItem('linku_logged_out');
        const roleLabel = user.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' :
                          user.role === 'instructor' ? 'อาจารย์ / บุคลากร' : 'นักศึกษา';
        showToast(`ยินดีต้อนรับกลับ ${user.full_name} (${roleLabel})`, 'success');
        closeModal('authModal');
        renderHeader();
        updateNotificationBadges();

        if (user.role === 'admin') {
            navigateTo('admin-dashboard');
        } else {
            renderCurrentView();
        }
    } else {
        showToast('ไม่พบบัญชีผู้ใช้นี้ในระบบ กรุณาตรวจสอบอีเมลหรือสมัครสมาชิกใหม่', 'error');
    }
}

export async function handleRegisterAvatarFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        showToast('กำลังประมวลผลรูปภาพโปรไฟล์...', 'info');
        const dataUrl = await processImageFile(file);
        registerAvatarDataUrl = dataUrl;

        const preview = document.getElementById('registerAvatarPreview');
        if (preview) {
            preview.innerHTML = `<img src="${dataUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        }
        showToast('อัปโหลดรูปโปรไฟล์เรียบร้อย', 'success');
    } catch (err) {
        showToast(err.message || 'ไม่สามารถโหลดรูปภาพได้', 'error');
    }
}

export async function handleRegister(e) {
    e.preventDefault();
    const role = document.getElementById('registerRoleInput').value;
    const name = document.getElementById('registerNameInput').value.trim();
    const email = document.getElementById('registerEmailInput').value.trim().toLowerCase();
    const passwordInput = document.getElementById('registerPasswordInput');
    const password = passwordInput.value;
    if (!validatePasswordStrength(password)) {
        passwordInput.reportValidity();
        return;
    }
    const faculty = document.getElementById('registerFacultyInput').value.trim();
    const dept = document.getElementById('registerDeptInput').value.trim();
    const studentYear = role === 'student'
        ? document.getElementById('registerStudentYearInput').value
        : '';
    const phone = document.getElementById('registerPhoneInput')?.value.trim() || '';
    const skillsStr = document.getElementById('registerSkillsInput')?.value || '';
    const skills = role === 'student'
        ? skillsStr.split(',').map(s => s.trim()).filter(Boolean)
        : [];
    const studentBio = document.getElementById('registerBioInput')?.value.trim() || '';

    // Check if user already exists
    const existing = await DB.getProfileByEmail(email);
    if (existing) {
        showToast('อีเมลนี้มีผู้ใช้งานแล้วในระบบ กรุณาใช้อีเมลอื่นหรือเข้าสู่ระบบ', 'error');
        return;
    }

    const newProfile = {
        id: uuidv4(),
        full_name: name,
        email: email,
        password,
        role: role,
        faculty: faculty,
        department: dept,
        year_level: role === 'student' ? studentYear : 'อาจารย์ / บุคลากร',
        student_year: studentYear || null,
        phone: phone,
        avatar_url: registerAvatarDataUrl,
        skills: skills,
        bio: role === 'student' ? studentBio : '',
        created_at: new Date().toISOString()
    };

    let saved;
    try {
        saved = await DB.upsertProfile(newProfile, { strict: true });
    } catch (error) {
        console.error('Profile registration failed:', error);
        const message = /password.*schema cache/i.test(error.message || '')
            ? "ตาราง profiles ยังไม่มี password ให้รัน ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password TEXT; NOTIFY pgrst, 'reload schema'; แล้วรีเฟรชหน้า"
            : `สร้างบัญชีบน Supabase ไม่สำเร็จ: ${error.message || 'ตรวจสอบสิทธิ์ตาราง profiles'}`;
        showToast(message, 'error');
        return;
    }
    AppState.currentUser = saved;
    registerAvatarDataUrl = '';
    localStorage.setItem('linku_active_user_id', saved.id);
    localStorage.removeItem('linku_logged_out');

    showToast(`สร้างบัญชีสำเร็จ ยินดีต้อนรับคุณ ${name}!`, 'success');
    closeModal('authModal');
    renderHeader();
    updateNotificationBadges();
    renderCurrentView();
}

// =========================================================================
// HELP & FAQ SYSTEM (Requirement 2)
// =========================================================================

export const FAQ_DATA = [
   
    {
        id: 'faq-2',
        category: 'auth',
        icon: '',
        question: 'ลืมรหัสผ่าน หรือเข้าสู่ระบบด้วยอีเมลมหาวิทยาลัยไม่ได้ ต้องแก้ไขอย่างไร?',
        summary: 'ตรวจสอบการสะกดอีเมลมหาวิทยาลัย หรือติดต่อแอดมินเพื่อตรวจสอบบัญชี',
        solution: [
            'สำหรับนักศึกษาและอาจารย์: ตรวจสอบการสะกดอีเมลมหาวิทยาลัยแม่โจ้ (ต้องลงท้ายด้วย <code>@mju.ac.th</code>)',
            'หากยังไม่เคยมีบัญชี ให้กดแท็บ "สมัครสมาชิกใหม่" เพื่อสร้างบัญชีนักศึกษาหรืออาจารย์เข้าสู่ระบบ',
            'หากยังพบปัญหา สามารถกรอกแบบฟอร์ม "ติดต่อทีมผู้ดูแลระบบ" ด้านล่างของหน้านี้เพื่อให้ทีมพัฒนาระบบตรวจสอบและรีเซ็ตบัญชีให้'
        ]
    },
    {
        id: 'faq-3',
        category: 'auth',
        icon: '',
        question: 'นักศึกษาใหม่หรืออาจารย์ที่ยังไม่มีบัญชี ต้องสมัครสมาชิกอย่างไร?',
        summary: 'สมัครสมาชิกผ่านแท็บ "สมัครสมาชิกใหม่" ในหน้าล็อกอิน',
        solution: [
            'คลิกปุ่ม "🔑 เข้าสู่ระบบ" ที่แถบเมนูด้านบนขวา',
            'เลือกแท็บ "สมัครสมาชิกใหม่"',
            'เลือกประเภทผู้ใช้งาน: 👨‍🎓 นักศึกษา หรือ 👨‍🏫 อาจารย์ / บุคลากร',
            'กรอกชื่อ-นามสกุล, อีเมลมหาวิทยาลัย, รหัสผ่าน, คณะ, สาขาวิชา, เบอร์โทรศัพท์ และทักษะความถนัด',
            'กดยืนยัน ระบบจะสร้างบัญชีและเข้าสู่ระบบทันที (สำหรับบทบาทแอดมินจะไม่มีการเปิดให้สมัครสมาชิก)'
        ]
    },
    {
        id: 'faq-4',
        category: 'student',
        icon: '',
        question: 'นักศึกษาจะค้นหาและสมัครงาน/โครงการในมหาวิทยาลัยได้อย่างไร?',
        summary: 'ค้นหางานที่หน้าแรก ดูรายละเอียด และกดสมัครงานพร้อมแนบ Portfolio',
        solution: [
            'ไปที่หน้าแรก (HOME) หรือพิมพ์ค้นหาในช่อง Search ตามชื่องาน คณะ หรือแท็กทักษะ',
            'คลิกดูรายละเอียดของประกาศงานเพื่อตรวจสอบคุณสมบัติ ค่าตอบแทน และระยะเวลาดำเนินงาน',
            'คลิกปุ่ม "สมัครงานนี้ 🚀" กรอกข้อความแนะนำตัวสั้นๆ และแนบลิงก์ผลงาน (Google Drive, Canva, Figma ฯลฯ)',
            'ติดตามสถานะการสมัครได้ที่เมนู "งานที่ฉันสมัคร" โดยสถานะจะเปลี่ยนจาก: รอพิจารณา ⏳ -> อนุมัติ ✅ -> กำลังดำเนินงาน 🚀 -> เสร็จสิ้น 🏆'
        ]
    },
    {
        id: 'faq-5',
        category: 'matching',
        icon: '',
        question: 'คะแนน "ความเหมาะสม (AI Match %)" คำนวณจากอะไร และจะเพิ่มคะแนนได้อย่างไร?',
        summary: 'คำนวณจากความสอดคล้องของทักษะและความสนใจในโปรไฟล์กับความต้องการของงาน',
        solution: [
            'ระบบ AI Matching คำนวณโดยเปรียบเทียบ "ทักษะและความสนใจในโปรไฟล์นักศึกษา" กับ "ทักษะที่ประกาศงานต้องการ (Required Skills)"',
            'หากมีทักษะตรงกันครบถ้วน จะได้รับคะแนนความเหมาะสมสูงสุดถึง 100%',
            'วิธีเพิ่มคะแนน: คลิกที่โปรไฟล์ของคุณด้านบนขวา -> เลือก "✏️ แก้ไขโปรไฟล์" -> เพิ่มทักษะที่คุณถนัด (เช่น Canva, Graphic Design, ตัดต่อวิดีโอ, React, Python) ในช่องทักษะ แล้วกดบันทึก ระบบจะคำนวณคะแนนจับคู่ใหม่ทันที'
        ]
    },
    {
        id: 'faq-6',
        category: 'matching',
        icon: '',
        question: 'ผลงานใน Portfolio ของนักศึกษาจะบันทึกอัตโนมัติได้อย่างไร และเพิ่มเองได้หรือไม่?',
        summary: 'บันทึกอัตโนมัติเมื่ออาจารย์ประเมินงานเสร็จสิ้น หรือกดเพิ่มผลงานด้วยตนเองได้',
        solution: [
            'บันทึกอัตโนมัติ: เมื่องานที่คุณสมัครดำเนินงานเสร็จสิ้น อาจารย์ผู้รับผิดชอบจะให้คะแนน (1-5 ดาว) และเขียนรีวิวประเมิน ซึ่งจะถูกนำไปบันทึกลงหน้า Portfolio ของคุณโดยอัตโนมัติ',
            'เพิ่มผลงานด้วยตนเอง: คุณสามารถเพิ่มผลงาน โปรเจกต์ หรือกิจกรรมอื่นๆ ได้ตลอดเวลา โดยไปที่เมนู "โปรไฟล์" แล้วคลิกปุ่ม "➕ เพิ่มผลงานใน Portfolio"'
        ]
    },
    {
        id: 'faq-7',
        category: 'instructor',
        icon: '',
        question: 'อาจารย์ต้องการประกาศงานใหม่ หรือแก้ไข/ปิดรับสมัครงานเดิม ต้องทำอย่างไร?',
        summary: 'ใช้ปุ่มประกาศงานใหม่ และจัดการงานที่ประกาศได้ผ่านเมนูของอาจารย์',
        solution: [
            'ประกาศงานใหม่: เข้าสู่ระบบด้วยบัญชีอาจารย์ -> คลิกปุ่ม "➕ ประกาศงานใหม่" ด้านบนขวา -> กรอกรายละเอียดงาน ทักษะที่ต้องการ ค่าตอบแทน และวันปิดรับสมัคร -> กด "บันทึกและเผยแพร่"',
            'แก้ไขประกาศงาน: ไปที่เมนู "จัดการงานที่ประกาศ" -> กดปุ่ม "✏️ แก้ไข" ในงานที่ต้องการปรับปรุงข้อมูล',
            'ปิดรับสมัคร: ในหน้าจัดการงานที่ประกาศ กดปุ่ม "ปิดรับ" เมื่องานนั้นได้รับนักศึกษาครบถ้วนแล้ว'
        ]
    },
    {
        id: 'faq-8',
        category: 'instructor',
        icon: '',
        question: 'อาจารย์จะคัดเลือกผู้สมัคร และให้คะแนนประเมินนักศึกษาอย่างไร?',
        summary: 'ดูรายชื่อผู้สมัครที่เรียงตาม AI Matching Score อนุมัติงาน และประเมินเมื่อเสร็จสิ้น',
        solution: [
            'ไปที่เมนู "ผู้สมัคร" หรือคลิก "ดูผู้สมัคร" ที่ประกาศงานนั้นๆ',
            'ระบบจะจัดเรียงรายชื่อนักศึกษาตามคะแนน AI Matching Score พร้อมแสดงข้อความแนะนำตัวและ Portfolio',
            'สามารถคลิกปุ่ม "💬 แชท" เพื่อพูดคุยสอบถามรายละเอียดเพิ่มเติมกับนักศึกษาแบบเรียลไทม์',
            'กดอนุมัติ (Approved) หรือปรับเป็นกำลังดำเนินงาน (In Progress) และเมื่อเสร็จสิ้นโครงการ ให้กดปุ่ม "⭐ ประเมินและรีวิว" เพื่อให้คะแนน 1-5 ดาว'
        ]
    },
    {
        id: 'faq-9',
        category: 'admin',
        icon: '',
        question: 'แอดมินสามารถดูภาพรวมและแก้ไขข้อมูลอะไรในเว็บไซต์ได้บ้าง?',
        summary: 'ดูแดชบอร์ดสถิติภาพรวม 5 มิติ และแก้ไขงาน ผู้ใช้ และการสมัครได้ทั้งหมด',
        solution: [
            'ดูภาพรวมแดชบอร์ด: จำนวนผู้สมัครทั้งหมด, จำนวนนักศึกษา, จำนวนอาจารย์, สัดส่วนประเภทงาน (งานส่วนใหญ่เป็นงานประเภทไหน) และความถนัดหรือความสนใจของนักศึกษา',
            'แก้ไขและจัดการงานทั้งหมด: ไปที่เมนู "📋 จัดการงานทั้งหมด" สามารถกดแก้ไขรายละเอียด ปิด/เปิดรับสมัคร หรือลบงานของอาจารย์ท่านใดก็ได้ในระบบ',
            'แก้ไขข้อมูลผู้ใช้และสิทธิ์: ไปที่เมนู "👥 จัดการผู้ใช้ & สิทธิ์" สามารถกดแก้ไขข้อมูลส่วนตัว ปรับเปลี่ยนบทบาท หรือลบผู้ใช้ได้ทันที',
            'จัดการการสมัครงานทั้งหมด: ไปที่เมนู "📑 การสมัครทั้งหมด" สามารถปรับเปลี่ยนสถานะการสมัครของนักศึกษาทุกคนได้โดยตรง'
        ]
    },
    {
        id: 'faq-10',
        category: 'admin',
        icon: '',
        question: 'แอดมินมีโหมดสลับบทบาท (Impersonate) เพื่อทดสอบระบบอย่างไร?',
        summary: 'ในหน้าจัดการผู้ใช้ แอดมินสามารถกดปุ่ม "สลับใช้บัญชีนี้" เพื่อทดสอบมุมมองของผู้ใช้คนใดก็ได้',
        solution: [
            'เข้าสู่เมนู "👥 จัดการผู้ใช้ & สิทธิ์" หรือดูที่ตารางผู้ใช้ในหน้าแดชบอร์ดแอดมิน',
            'ในแถวของผู้ใช้ที่ต้องการทดสอบ ให้คลิกปุ่ม "🚪 สลับใช้บัญชีนี้"',
            'ระบบจะเข้าใช้งานในมุมมองของผู้ใช้นั้นๆ ทันที ทำให้แอดมินสามารถทดสอบการสมัครงาน การโพสต์งาน หรือการแชทได้โดยไม่ต้องกรอกรหัสผ่านใหม่',
            'เมื่อทดสอบเสร็จ สามารถกดออกจากระบบหรือสลับกลับมาเป็นแอดมินได้ตลอดเวลา'
        ]
    }
];

let activeFaqCategory = 'all';

export function initHelpFaq() {
    renderFaqList(FAQ_DATA);
}

export function renderFaqList(items) {
    const listContainer = document.getElementById('faqAccordionList');
    if (!listContainer) return;

    if (!items || items.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align:center; padding:32px 16px; color:var(--text-muted); font-size:0.9rem;">
                🔍 ไม่พบคำถามที่ตรงกับคำค้นหาของคุณ กรุณาลองใช้คำค้นหาอื่น หรือส่งข้อความสอบถามด้านล่าง
            </div>
        `;
        return;
    }

    listContainer.innerHTML = items.map((item, idx) => `
        <div class="faq-item" id="${item.id}">
            <div class="faq-question" onclick="window.linkUApp.toggleFaqItem('${item.id}')">
                <div class="faq-question-title">
                    <span class="faq-question-icon">${item.icon}</span>
                    <span>${escapeHTML(item.question)}</span>
                </div>
                <span class="faq-chevron">▼</span>
            </div>
            <div class="faq-answer">
                <div style="font-weight:600; color:var(--text-primary); margin-bottom:6px;">
                    💡 วิธีแก้ไข / คำแนะนำ:
                </div>
                <ul class="faq-solution-steps">
                    ${item.solution.map(step => `<li>${step}</li>`).join('')}
                </ul>
            </div>
        </div>
    `).join('');
}

export function toggleHelpFaq(show) {
    const modal = document.getElementById('helpFaqModal');
    if (!modal) return;
    if (show) {
        modal.classList.add('active');
        renderFaqList(FAQ_DATA);
    } else {
        modal.classList.remove('active');
    }
}

export function setFaqCategory(category) {
    activeFaqCategory = category;
    document.querySelectorAll('.faq-chip').forEach(btn => {
        if (btn.getAttribute('data-cat') === category) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    filterFaq();
}

export function clearFaqSearch() {
    const searchInput = document.getElementById('faqSearchInput');
    const clearBtn = document.getElementById('faqClearBtn');
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    filterFaq();
}

export function filterFaq() {
    const searchInput = document.getElementById('faqSearchInput');
    const clearBtn = document.getElementById('faqClearBtn');
    const query = (searchInput?.value || '').toLowerCase().trim();

    if (clearBtn) {
        clearBtn.style.display = query ? 'block' : 'none';
    }

    let filtered = FAQ_DATA;
    if (activeFaqCategory !== 'all') {
        filtered = filtered.filter(item => item.category === activeFaqCategory);
    }
    if (query) {
        filtered = filtered.filter(item =>
            item.question.toLowerCase().includes(query) ||
            item.summary.toLowerCase().includes(query) ||
            item.solution.some(s => s.toLowerCase().includes(query))
        );
    }

    renderFaqList(filtered);
}

export function toggleFaqItem(id) {
    const item = document.getElementById(id);
    if (!item) return;
    const isActive = item.classList.contains('active');
    document.querySelectorAll('.faq-item').forEach(el => el.classList.remove('active'));
    if (!isActive) {
        item.classList.add('active');
    }
}

export function handleHelpContactSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('helpContactName')?.value || '';
    const email = document.getElementById('helpContactEmail')?.value || '';
    const msg = document.getElementById('helpContactMsg')?.value || '';

    showToast(`ขอบคุณคุณ ${name} ทีมงานได้รับข้อความช่วยเหลือของคุณเรียบร้อยแล้ว และจะติดต่อกลับโดยเร็วที่สุด!`, 'success');
    const form = document.getElementById('helpContactForm');
    if (form) form.reset();
}

// =========================================================================
// ADMIN VIEWS & DASHBOARD (Requirement 1)
// =========================================================================

// VIEW: 9. Admin Executive Dashboard
export async function renderAdminDashboardView() {
    const container = document.getElementById('viewContainer');
    const stats = await DB.getAdminDashboardStats();
    const allJobs = await DB.getJobs();
    const allProfiles = await DB.getAllProfiles();

    container.innerHTML = `
        <div class="section-header">
            <div>
                <h1 class="section-title">
                    <span>🛡️ Dashboard ผู้ดูแลระบบ (Admin Overview)</span>
                </h1>
                <p style="font-size:0.88rem; color:var(--text-secondary); margin-top:4px;">
                    สถิติภาพรวมเชิงลึกและศูนย์ควบคุมบริหารจัดการข้อมูลทั้งหมดในระบบ Link U
                </p>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button class="btn btn-outline btn-sm" onclick="window.linkUApp.renderAdminDashboardView()">
                    🔄 รีเฟรชข้อมูล
                </button>
                <button class="btn btn-primary btn-sm" onclick="window.linkUApp.openJobEditorModal()">
                    ➕ ประกาศงานใหม่
                </button>
            </div>
        </div>

        <!-- 1. Top Metrics Summary Cards -->
        <div class="admin-metric-grid">
            <div class="admin-stat-card">
                <div class="admin-stat-icon blue">👥</div>
                <div class="admin-stat-info">
                    <span class="admin-stat-value">${stats.totalApplications}</span>
                    <span class="admin-stat-title">จำนวนการสมัครทั้งหมด</span>
                    <span class="admin-stat-sub">ผู้สมัครจริง: <strong>${stats.uniqueApplicants} คน</strong> (อนุมัติแล้ว ${stats.approvedCount})</span>
                </div>
            </div>

            <div class="admin-stat-card">
                <div class="admin-stat-icon emerald">👨‍🎓</div>
                <div class="admin-stat-info">
                    <span class="admin-stat-value">${stats.totalStudents}</span>
                    <span class="admin-stat-title">เป็นนักศึกษาในระบบ</span>
                    <span class="admin-stat-sub">นักศึกษาผู้ยื่นสมัครและสะสม Portfolio</span>
                </div>
            </div>

            <div class="admin-stat-card">
                <div class="admin-stat-icon amber">👨‍🏫</div>
                <div class="admin-stat-info">
                    <span class="admin-stat-value">${stats.totalInstructors}</span>
                    <span class="admin-stat-title">เป็นอาจารย์ / บุคลากร</span>
                    <span class="admin-stat-sub">ผู้ประกาศรับสมัครและประเมินผลงาน</span>
                </div>
            </div>

            <div class="admin-stat-card">
                <div class="admin-stat-icon purple">📢</div>
                <div class="admin-stat-info">
                    <span class="admin-stat-value">${stats.totalJobs}</span>
                    <span class="admin-stat-title">งานประกาศทั้งหมด</span>
                    <span class="admin-stat-sub">เปิดรับ: <strong>${stats.activeJobs}</strong> | ปิดรับ: <strong>${stats.closedJobs}</strong></span>
                </div>
            </div>
        </div>

        <!-- 2. Core Analytics: Job Types & Student Skills/Interests -->
        <div class="dashboard-sections-grid" style="margin-bottom:24px;">
            <!-- Column 1: งานส่วนใหญ่เป็นงานประเภทไหน (Job Categories Distribution) -->
            <div class="dashboard-panel">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <h3 class="panel-title">
                        <span>📊 งานส่วนใหญ่เป็นงานประเภทไหน (Job Categories)</span>
                    </h3>
                    <span style="font-size:0.75rem; color:var(--text-muted); background:var(--bg-subtle); padding:2px 8px; border-radius:var(--radius-full);">
                        วิเคราะห์จาก ${stats.totalJobs} ประกาศงาน
                    </span>
                </div>
                <p style="font-size:0.82rem; color:var(--text-secondary); margin-bottom:16px;">
                    สัดส่วนประเภทงานที่อาจารย์และหน่วยงานภายในมหาวิทยาลัยเปิดรับสมัครมากที่สุด
                </p>

                <div style="display:flex; flex-direction:column; gap:14px;">
                    ${stats.jobCategories.map(cat => `
                        <div class="category-item-row">
                            <div class="category-labels">
                                <span style="display:flex; align-items:center; gap:6px;">
                                    <span>${cat.icon}</span>
                                    <span>${escapeHTML(cat.name)}</span>
                                </span>
                                <span style="color:var(--text-primary); font-size:0.85rem;">
                                    <strong>${cat.count} โครงการ</strong> (${cat.percentage}%)
                                </span>
                            </div>
                            <div class="category-track">
                                <div class="category-fill" style="width: ${cat.percentage}%; background-color: ${cat.color};"></div>
                            </div>
                            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:3px;">
                                ${escapeHTML(cat.desc)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Column 2: นักศึกษามีความถนัดหรือสนใจในด้านไหนบ้าง (Student Skills & Interests) -->
            <div class="dashboard-panel">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <h3 class="panel-title">
                        <span>🎯 นักศึกษามีความถนัดหรือสนใจในด้านไหนบ้าง</span>
                    </h3>
                    <span style="font-size:0.75rem; color:var(--text-muted); background:var(--bg-subtle); padding:2px 8px; border-radius:var(--radius-full);">
                        วิเคราะห์จาก ${stats.totalStudents} นักศึกษา
                    </span>
                </div>

                <!-- Part A: ความถนัดและความสามารถ (Student Skills) -->
                <div style="margin-bottom:20px;">
                    <h4 style="font-size:0.86rem; font-weight:700; color:var(--text-primary); margin-bottom:10px; display:flex; align-items:center; gap:6px;">
                        <span>⭐ ทักษะความถนัดยอดนิยมของนักศึกษา (Top Student Skills)</span>
                    </h4>
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        ${stats.topStudentSkills.slice(0, 6).map((skill, idx) => `
                            <div>
                                <div style="display:flex; justify-content:space-between; font-size:0.82rem; margin-bottom:4px;">
                                    <span style="font-weight:600;">${idx + 1}. ${escapeHTML(skill.name)}</span>
                                    <span style="color:var(--text-secondary);">${skill.count} คน (${skill.percentage}%)</span>
                                </div>
                                <div class="skill-bar-track" style="height:6px;">
                                    <div class="skill-bar-fill" style="width: ${skill.percentage}%; background: linear-gradient(90deg, var(--primary), var(--accent-cyan));"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Part B: ความสนใจของนักศึกษา (Student Interests) -->
                <div>
                    <h4 style="font-size:0.86rem; font-weight:700; color:var(--text-primary); margin-bottom:10px; display:flex; align-items:center; gap:6px;">
                        <span>💡 ความสนใจเฉพาะด้านของนักศึกษา (Student Career Interests)</span>
                    </h4>
                    <div style="display:flex; flex-wrap:wrap; gap:8px;">
                        ${stats.topStudentInterests.map(interest => `
                            <span class="interest-tag-pill">
                                <span>🎯 ${escapeHTML(interest.name)}</span>
                                <span style="background:var(--primary); color:#FFF; font-size:0.68rem; padding:1px 6px; border-radius:999px;">${interest.count} คน</span>
                            </span>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>

        <!-- 3. Admin Full Control Hub: Edit Everything in the Website -->
        <div class="dashboard-panel" style="margin-bottom:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
                <div>
                    <h3 class="panel-title" style="display:flex; align-items:center; gap:8px;">
                        <span>⚙️ ศูนย์ควบคุมและแก้ไขข้อมูลทั้งหมดในเว็บไซต์ (Admin Full Control Hub)</span>
                    </h3>
                    <p style="font-size:0.82rem; color:var(--text-secondary); margin-top:2px;">
                        แอดมินสามารถดูภาพรวมและมีสิทธิ์แก้ไข ลบ หรือปรับสถานะข้อมูลได้ทุกอย่างในเว็บไซต์
                    </p>
                </div>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn btn-outline btn-sm" onclick="window.linkUApp.navigateTo('admin-manage-jobs')">
                        📋 ไปที่หน้าจัดการงานทั้งหมด (${stats.totalJobs})
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="window.linkUApp.navigateTo('admin-manage-users')">
                        👥 ไปที่หน้าจัดการผู้ใช้ทั้งหมด (${allProfiles.length})
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="window.linkUApp.navigateTo('admin-manage-applications')">
                        📑 ไปที่หน้าการสมัครทั้งหมด (${stats.totalApplications})
                    </button>
                </div>
            </div>

            <!-- Fast Tables Grid (Jobs & Users preview with direct action buttons) -->
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:18px;">
                <!-- Fast Jobs Table -->
                <div style="background:var(--bg-main); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:16px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <strong style="font-size:0.9rem; color:var(--text-primary);">📋 ประกาศงานล่าสุดในระบบ (แก้ไขได้ทันที)</strong>
                        <span style="font-size:0.75rem; color:var(--text-muted);">${allJobs.length} รายการ</span>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:8px; max-height:280px; overflow-y:auto;">
                        ${allJobs.map(job => `
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-sm);">
                                <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:60%;">
                                    <div style="font-weight:600; font-size:0.85rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHTML(job.title)}</div>
                                    <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHTML(job.instructor_name)} • ${job.status === 'open' ? '🟢 เปิดรับ' : '🔴 ปิดรับ'}</div>
                                </div>
                                <div style="display:flex; gap:4px; flex-shrink:0;">
                                    <button class="btn btn-outline btn-sm" style="padding:4px 8px; font-size:0.75rem;" onclick="window.linkUApp.openJobEditorModal('${job.id}')" title="แก้ไขงาน">
                                        ✏️ แก้ไข
                                    </button>
                                    <button class="btn btn-outline btn-sm" style="padding:4px 8px; font-size:0.75rem;" onclick="window.linkUApp.toggleJobStatus('${job.id}', '${job.status === 'open' ? 'closed' : 'open'}')">
                                        ${job.status === 'open' ? 'ปิด' : 'เปิด'}
                                    </button>
                                    <button class="btn btn-danger btn-sm" style="padding:4px 8px; font-size:0.75rem;" onclick="window.linkUApp.confirmDeleteJob('${job.id}')" title="ลบงาน">
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Fast Users Table -->
                <div style="background:var(--bg-main); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:16px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <strong style="font-size:0.9rem; color:var(--text-primary);">👥 ข้อมูลผู้ใช้งานในระบบ (แก้ไขได้ทันที)</strong>
                        <span style="font-size:0.75rem; color:var(--text-muted);">${allProfiles.length} บัญชี</span>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:8px; max-height:280px; overflow-y:auto;">
                        ${allProfiles.map(u => `
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-sm);">
                                <div style="display:flex; align-items:center; gap:8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:62%;">
                                    <div style="width:28px; height:28px; border-radius:50%; background:var(--primary-100); color:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.75rem; flex-shrink:0;">
                                        ${(u.full_name || 'U').charAt(0)}
                                    </div>
                                    <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                                        <div style="font-weight:600; font-size:0.82rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHTML(u.full_name)}</div>
                                        <div style="font-size:0.72rem; color:var(--text-muted);">${u.role === 'admin' ? '🛡️ แอดมิน' : u.role === 'instructor' ? '👨‍🏫 อาจารย์' : '👨‍🎓 นักศึกษา'} • ${escapeHTML(u.email)}</div>
                                    </div>
                                </div>
                                <div style="display:flex; gap:4px; flex-shrink:0;">
                                    <button class="btn btn-outline btn-sm" style="padding:4px 8px; font-size:0.75rem;" onclick="window.linkUApp.openAdminUserEditModal('${u.id}')" title="แก้ไขข้อมูล">
                                        ✏️ แก้ไข
                                    </button>
                                    <button class="btn btn-outline btn-sm" style="padding:4px 8px; font-size:0.75rem;" onclick="window.linkUApp.impersonateUser('${u.id}')" title="สลับเข้าใช้บัญชีนี้">
                                        🚪 สลับใช้
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// VIEW: 10. Admin Manage All Jobs View
export async function renderAdminManageJobsView() {
    const container = document.getElementById('viewContainer');
    const jobs = await DB.getJobs();
    const applications = await DB.getApplications();

    container.innerHTML = `
        <div class="section-header">
            <div>
                <h1 class="section-title">
                    <span>📋 จัดการประกาศงานทั้งหมดในระบบ (All Jobs Management)</span>
                </h1>
                <p style="font-size:0.88rem; color:var(--text-secondary); margin-top:4px;">
                    แอดมินสามารถตรวจสอบ แก้ไขรายละเอียด ปิดรับสมัคร หรือลบประกาศงานทั้งหมดได้
                </p>
            </div>
            <div style="display:flex; gap:8px;">
                <button class="btn btn-outline btn-sm" onclick="window.linkUApp.navigateTo('admin-dashboard')">
                    ⬅️ แดชบอร์ดแอดมิน
                </button>
                <button class="btn btn-primary btn-sm" onclick="window.linkUApp.openJobEditorModal()">
                    ➕ ประกาศงานใหม่
                </button>
            </div>
        </div>

        <div class="admin-table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ชื่องาน / โครงการ</th>
                        <th>คณะ / หน่วยงาน</th>
                        <th>ผู้ประกาศงาน</th>
                        <th>รับ (คน)</th>
                        <th>ค่าตอบแทน</th>
                        <th>ผู้สมัคร</th>
                        <th>สถานะ</th>
                        <th>การจัดการ (Admin Actions)</th>
                    </tr>
                </thead>
                <tbody>
                    ${jobs.length === 0 ? `
                        <tr><td colspan="8" style="text-align:center; padding:30px; color:var(--text-muted);">ไม่มีประกาศงานในระบบ</td></tr>
                    ` : jobs.map(job => {
                        const appCount = applications.filter(a => a.job_id === job.id).length;
                        return `
                            <tr>
                                <td>
                                    <strong style="color:var(--text-primary); cursor:pointer;" onclick="window.linkUApp.openJobDetailModal('${job.id}')">${escapeHTML(job.title)}</strong>
                                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
                                        ${(job.required_skills || []).slice(0, 3).map(s => `<span class="tag-chip" style="padding:1px 6px; font-size:0.7rem;">${escapeHTML(s)}</span>`).join(' ')}
                                    </div>
                                </td>
                                <td>${escapeHTML(job.department || '-')}</td>
                                <td>${escapeHTML(job.instructor_name || '-')}</td>
                                <td>${job.positions || 1} คน</td>
                                <td>
                                    ${escapeHTML(job.stipend ? formatJobStipend(job) : '-')}
                                    ${job.activity_hours !== null && job.activity_hours !== undefined ? `<div class="form-help">กิจกรรม ${escapeHTML(String(job.activity_hours))} ชม. (${escapeHTML(job.activity_scope || 'มหาลัย')})</div>` : ''}
                                    ${job.benefits ? `<div class="form-help">${escapeHTML(job.benefits)}</div>` : ''}
                                </td>
                                <td>
                                    <span style="font-weight:700; color:var(--primary);">${appCount} คน</span>
                                </td>
                                <td>
                                    <span class="job-status-pill ${job.status}">
                                        ${job.status === 'open' ? '🟢 เปิดรับ' : '🔴 ปิดรับ'}
                                    </span>
                                </td>
                                <td>
                                    <div style="display:flex; gap:6px;">
                                        <button class="btn btn-outline btn-sm" style="padding:4px 8px;" onclick="window.linkUApp.openJobEditorModal('${job.id}')" title="แก้ไขงาน">
                                            ✏️ แก้ไข
                                        </button>
                                        <button class="btn btn-outline btn-sm" style="padding:4px 8px;" onclick="window.linkUApp.toggleJobStatus('${job.id}', '${job.status === 'open' ? 'closed' : 'open'}')">
                                            ${job.status === 'open' ? 'ปิดรับ' : 'เปิดรับ'}
                                        </button>
                                        <button class="btn btn-danger btn-sm" style="padding:4px 8px;" onclick="window.linkUApp.confirmDeleteJob('${job.id}')" title="ลบงานนี้">
                                            🗑️ ลบ
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// VIEW: 11. Admin Manage All Users View
export async function renderAdminManageUsersView() {
    const container = document.getElementById('viewContainer');
    const profiles = await DB.getAllProfiles();

    container.innerHTML = `
        <div class="section-header">
            <div>
                <h1 class="section-title">
                    <span>👥 จัดการผู้ใช้งานและสิทธิ์ในระบบ (All Users Management)</span>
                </h1>
                <p style="font-size:0.88rem; color:var(--text-secondary); margin-top:4px;">
                    ตรวจสอบและแก้ไขข้อมูลผู้ใช้ ปรับเปลี่ยนบทบาท หรือลบบัญชีผู้ใช้งานในระบบ
                </p>
            </div>
            <div style="display:flex; gap:8px;">
                <button class="btn btn-outline btn-sm" onclick="window.linkUApp.navigateTo('admin-dashboard')">
                    ⬅️ แดชบอร์ดแอดมิน
                </button>
            </div>
        </div>

        <div class="admin-table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ชื่อ - นามสกุล</th>
                        <th>อีเมล / ชื่อผู้ใช้</th>
                        <th>บทบาท (Role)</th>
                        <th>คณะ</th>
                        <th>สาขาวิชา / หน่วยงาน</th>
                        <th>เบอร์โทร</th>
                        <th>ทักษะ / ความสนใจ</th>
                        <th>การจัดการ (Admin Actions)</th>
                    </tr>
                </thead>
                <tbody>
                    ${profiles.map(user => {
                        const roleBadgeClass = user.role === 'admin' ? 'job-status-pill closed' : user.role === 'instructor' ? 'job-status-pill open' : 'tag-chip';
                        const roleName = user.role === 'admin' ? '🛡️ ผู้ดูแลระบบ' : user.role === 'instructor' ? '👨‍🏫 อาจารย์/บุคลากร' : '👨‍🎓 นักศึกษา';
                        return `
                            <tr>
                                <td>
                                    <div style="display:flex; align-items:center; gap:8px;">
                                        <div style="width:32px; height:32px; border-radius:50%; background:var(--primary-100); color:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:700; flex-shrink:0;">
                                            ${(user.full_name || 'U').charAt(0)}
                                        </div>
                                        <div>
                                            <strong>${escapeHTML(user.full_name)}</strong>
                                            <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHTML(user.role === 'student' ? getStudentYear(user) : user.year_level || '')}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>${escapeHTML(user.email)}</td>
                                <td>
                                    <span class="${roleBadgeClass}" style="font-size:0.75rem; font-weight:700;">
                                        ${roleName}
                                    </span>
                                </td>
                                <td>${escapeHTML(user.faculty || '-')}</td>
                                <td>${escapeHTML(user.department || '-')}</td>
                                <td>${escapeHTML(user.phone || '-')}</td>
                                <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                                    ${(user.skills || []).join(', ') || '-'}
                                </td>
                                <td>
                                    <div style="display:flex; gap:6px;">
                                        <button class="btn btn-outline btn-sm" style="padding:4px 8px;" onclick="window.linkUApp.openAdminUserEditModal('${user.id}')" title="แก้ไขข้อมูลผู้ใช้">
                                            ✏️ แก้ไข
                                        </button>
                                        <button class="btn btn-outline btn-sm" style="padding:4px 8px;" onclick="window.linkUApp.impersonateUser('${user.id}')" title="เข้าสู่ระบบในมุมมองผู้ใช้นี้">
                                            🚪 สลับใช้
                                        </button>
                                        <button class="btn btn-danger btn-sm" style="padding:4px 8px;" onclick="window.linkUApp.confirmDeleteUser('${user.id}')" title="ลบผู้ใช้นี้">
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// VIEW: 12. Admin Manage All Applications View
export async function renderAdminManageApplicationsView() {
    const container = document.getElementById('viewContainer');
    const applications = await DB.getApplications();
    const jobs = await DB.getJobs();
    const profiles = await DB.getAllProfiles();

    container.innerHTML = `
        <div class="section-header">
            <div>
                <h1 class="section-title">
                    <span>📑 จัดการการสมัครงานทั้งหมดในระบบ (All Applications)</span>
                </h1>
                <p style="font-size:0.88rem; color:var(--text-secondary); margin-top:4px;">
                    ตรวจสอบและปรับเปลี่ยนสถานะการสมัครของนักศึกษาในทุกประกาศงาน
                </p>
            </div>
            <div style="display:flex; gap:8px;">
                <button class="btn btn-outline btn-sm" onclick="window.linkUApp.navigateTo('admin-dashboard')">
                    ⬅️ แดชบอร์ดแอดมิน
                </button>
            </div>
        </div>

        <div class="admin-table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>นักศึกษาผู้สมัคร</th>
                        <th>ชื่องาน / โครงการ</th>
                        <th>คณะ</th>
                        <th>ความเหมาะสม (AI Match)</th>
                        <th>ข้อความแนะนำตัว</th>
                        <th>สถานะปัจจุบัน</th>
                        <th>ปรับสถานะ (Admin Action)</th>
                    </tr>
                </thead>
                <tbody>
                    ${applications.length === 0 ? `
                        <tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">ยังไม่มีรายการสมัครงานในระบบ</td></tr>
                    ` : applications.map(app => {
                        const job = jobs.find(j => j.id === app.job_id);
                        const student = profiles.find(p => p.id === app.student_id);
                        const statusMap = {
                            'pending': { label: '⏳ รอพิจารณา', class: 'warning' },
                            'approved': { label: '✅ อนุมัติแล้ว', class: 'success' },
                            'in_progress': { label: '🚀 กำลังดำเนินการ', class: 'info' },
                            'completed': { label: '🏆 เสร็จสิ้น', class: 'success' },
                            'rejected': { label: '❌ ปฏิเสธ', class: 'danger' }
                        };
                        const currentStatusInfo = statusMap[app.status] || { label: app.status, class: 'default' };

                        return `
                            <tr>
                                <td>
                                    <strong>${escapeHTML(app.student_name || student?.full_name || '-')}</strong>
                                    <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHTML(app.student_email || student?.email || '')}</div>
                                </td>
                                <td>
                                    <strong>${escapeHTML(job?.title || 'โครงการในระบบ')}</strong>
                                    <div style="font-size:0.75rem; color:var(--text-muted);">ผู้ประกาศ: ${escapeHTML(job?.instructor_name || '-')}</div>
                                </td>
                                <td>${escapeHTML(job?.department || app.student_faculty || '-')}</td>
                                <td>
                                    <span class="matching-score-badge" style="font-size:0.8rem; padding:2px 8px;">
                                        <strong>${app.matching_score || 0}%</strong>
                                    </span>
                                </td>
                                <td style="max-width:200px;">
                                    <div style="font-size:0.8rem; color:var(--text-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                                        ${escapeHTML(app.message || '-')}
                                    </div>
                                    ${app.portfolio_link ? `
                                        <a href="${escapeHTML(app.portfolio_link)}" target="_blank" style="font-size:0.75rem; color:var(--primary);">🔗 ลิงก์ผลงาน</a>
                                    ` : ''}
                                </td>
                                <td>
                                    <span class="job-status-pill" style="font-size:0.75rem; font-weight:700;">
                                        ${currentStatusInfo.label}
                                    </span>
                                </td>
                                <td>
                                    <div style="display:flex; gap:6px; align-items:center;">
                                        <select class="form-select" style="padding:4px 8px; font-size:0.75rem; width:auto;" onchange="window.linkUApp.changeApplicationStatus('${app.id}', this.value)">
                                            <option value="pending" ${app.status === 'pending' ? 'selected' : ''}>⏳ รอพิจารณา</option>
                                            <option value="approved" ${app.status === 'approved' ? 'selected' : ''}>✅ อนุมัติ</option>
                                            <option value="in_progress" ${app.status === 'in_progress' ? 'selected' : ''}>🚀 กำลังดำเนินการ</option>
                                            <option value="completed" ${app.status === 'completed' ? 'selected' : ''}>🏆 เสร็จสิ้น</option>
                                            <option value="rejected" ${app.status === 'rejected' ? 'selected' : ''}>❌ ปฏิเสธ</option>
                                        </select>
                                        <button class="btn btn-danger btn-sm" style="padding:4px 8px;" onclick="window.linkUApp.confirmDeleteApplication('${app.id}')" title="ลบใบสมัคร">
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Admin User Edit Actions
export async function openAdminUserEditModal(userId) {
    const user = await DB.getProfile(userId);
    if (!user) {
        showToast('ไม่พบข้อมูลผู้ใช้', 'error');
        return;
    }

    document.getElementById('adminEditUserId').value = user.id;
    document.getElementById('adminEditUserName').value = user.full_name || '';
    document.getElementById('adminEditUserRole').value = user.role || 'student';
    document.getElementById('adminEditUserEmail').value = user.email || '';
    document.getElementById('adminEditUserPassword').value = user.password || '123456';
    document.getElementById('adminEditUserFaculty').value = user.faculty || '';
    document.getElementById('adminEditUserDept').value = user.department || '';
    document.getElementById('adminEditUserYear').value = user.role === 'student'
        ? getStudentYear(user)
        : user.year_level || '';
    document.getElementById('adminEditUserPhone').value = user.phone || '';
    document.getElementById('adminEditUserSkills').value = (user.skills || []).join(', ');
    document.getElementById('adminEditUserInterests').value = user.interests || '';
    document.getElementById('adminEditUserBio').value = user.bio || '';

    openModal('adminUserEditModal');
}

export async function handleAdminUserEditSubmit(e) {
    e.preventDefault();
    const userId = document.getElementById('adminEditUserId').value;
    const name = document.getElementById('adminEditUserName').value.trim();
    const role = document.getElementById('adminEditUserRole').value;
    const email = document.getElementById('adminEditUserEmail').value.trim();
    const password = document.getElementById('adminEditUserPassword').value.trim();
    const faculty = document.getElementById('adminEditUserFaculty').value.trim();
    const dept = document.getElementById('adminEditUserDept').value.trim();
    const year = document.getElementById('adminEditUserYear').value.trim();
    const phone = document.getElementById('adminEditUserPhone').value.trim();
    const skillsStr = document.getElementById('adminEditUserSkills').value;
    const skills = skillsStr.split(',').map(s => s.trim()).filter(Boolean);
    const interests = document.getElementById('adminEditUserInterests').value.trim();
    const bio = document.getElementById('adminEditUserBio').value.trim();

    const existing = await DB.getProfile(userId);
    const updated = {
        ...existing,
        id: userId,
        full_name: name,
        role: role,
        email: email,
        password: password,
        faculty: faculty,
        department: dept,
        year_level: year,
        student_year: role === 'student' ? year : null,
        phone: phone,
        skills: skills,
        interests: interests,
        bio: bio
    };

    await DB.upsertProfile(updated);

    if (AppState.currentUser?.id === userId) {
        AppState.currentUser = updated;
        renderHeader();
    }

    showToast(`บันทึกการแก้ไขข้อมูลของ ${name} เรียบร้อยแล้ว`, 'success');
    closeModal('adminUserEditModal');
    renderCurrentView();
}

export async function confirmDeleteUser(userId) {
    if (AppState.currentUser?.id === userId) {
        showToast('คุณไม่สามารถลบบัญชีของตนเองที่กำลังเข้าสู่ระบบอยู่ได้', 'error');
        return;
    }
    const user = await DB.getProfile(userId);
    if (!user) return;

    if (confirm(`คุณต้องการลบผู้ใช้ "${user.full_name}" (${user.email}) ใช่หรือไม่? การลบจะไม่สามารถกู้คืนได้`)) {
        await DB.deleteProfile(userId);
        showToast(`ลบผู้ใช้ ${user.full_name} เรียบร้อยแล้ว`, 'success');
        renderCurrentView();
    }
}

export async function impersonateUser(userId) {
    const user = await DB.getProfile(userId);
    if (!user) {
        showToast('ไม่พบข้อมูลผู้ใช้', 'error');
        return;
    }
    AppState.currentUser = user;
    localStorage.setItem('linku_active_user_id', user.id);
    const roleLabel = user.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : user.role === 'instructor' ? 'อาจารย์/บุคลากร' : 'นักศึกษา';
    showToast(`สลับบทบาทเข้าใช้งานในมุมมอง: ${user.full_name} (${roleLabel})`, 'info');
    renderHeader();
    if (user.role === 'admin') {
        navigateTo('admin-dashboard');
    } else {
        navigateTo('jobs');
    }
}

export async function confirmDeleteApplication(appId) {
    if (confirm('คุณต้องการลบรายการสมัครงานนี้ใช่หรือไม่?')) {
        await DB.deleteApplication(appId);
        showToast('ลบรายการสมัครงานเรียบร้อย', 'success');
        renderCurrentView();
    }
}

// Attach controller methods to global linkUApp object for inline HTML event handlers
window.linkUApp = {
    navigateTo,
    navigateToApplicants,
    toggleUserRole,
    openAuthModal,
    switchAuthTab,
    selectRegisterRole,
    handleLogin,
    handleRegister,
    validatePasswordStrength,
    handleDeadlineBEInput,
    toggleDeadlineCalendar,
    shiftDeadlineCalendar,
    setDeadlineCalendarMonth,
    setDeadlineCalendarYear,
    selectDeadlineCalendarDay,
    handleApplyFileSelect,
    clearApplyFile,
    openApplicationAttachment,
    handleRegisterAvatarFile,
    handleLogout,
    handleQuickContactSave,
    handleDirectAvatarFile,
    handleModalAvatarFile,
    openJobEditorModal,
    openJobDetailModal,
    openApplyModal,
    openProfileEditModal,
    openPortfolioAddModal,
    openReviewModal,
    openChatWithUser,
    openStudentProfile,
    selectChatConversation,
    sendChatMessage,
    openChatLinkModal,
    sendChatLink,
    handleChatAttachment,
    closeChatAttachmentMenu,
    openNotification,
    markAllNotificationsRead,
    changeApplicationStatus,
    toggleJobStatus,
    confirmDeleteJob,
    deletePortfolioItem,
    openModal,
    closeModal,
    showToast,
    renderDashboardView,
    renderJobsFeed,
    // FAQ Handlers
    toggleHelpFaq,
    filterFaq,
    setFaqCategory,
    clearFaqSearch,
    toggleFaqItem,
    handleHelpContactSubmit,
    // Admin Handlers
    renderAdminDashboardView,
    renderAdminManageJobsView,
    renderAdminManageUsersView,
    renderAdminManageApplicationsView,
    openAdminUserEditModal,
    handleAdminUserEditSubmit,
    confirmDeleteUser,
    impersonateUser,
    confirmDeleteApplication
};
