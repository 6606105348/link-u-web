// Link U - AI & Smart Skill Matching Engine
// Calculates compatibility scores between student skills and job requirements

export const MatchingEngine = {
    // Clean and normalize skill text
    normalize(str) {
        return (str || '')
            .toLowerCase()
            .replace(/[^\w\sก-๙]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    },

    // Skill synonym dictionary for university contexts
    synonyms: {
        'graphic': ['canva', 'photoshop', 'illustrator', 'design', 'ออกแบบ', 'กราฟิก'],
        'canva': ['graphic', 'design', 'ออกแบบ'],
        'video': ['premiere', 'capcut', 'ตัดต่อ', 'วิดีโอ', 'video editing', 'after effects'],
        'ตัดต่อ': ['video', 'capcut', 'premiere pro', 'วิดีโอ'],
        'web': ['html', 'css', 'javascript', 'react', 'vue', 'frontend', 'เว็บ'],
        'react': ['javascript', 'web', 'frontend'],
        'python': ['data', 'ai', 'machine learning', 'วิเคราะห์ข้อมูล'],
        'data': ['excel', 'python', 'sql', 'วิเคราะห์ข้อมูล', 'สถิติ'],
        'excel': ['data', 'ตารางคำนวณ', 'คีย์ข้อมูล', 'data entry'],
        'ถ่ายภาพ': ['photography', 'photo', 'กล้อง', 'ตากล้อง'],
        'ประสานงาน': ['coordination', 'communication', 'จัดการ', 'admin'],
        'mc': ['พิธีกร', 'การพูด', 'สื่อสาร', 'speaker']
    },

    // Check if two skills match or are strongly related
    isSkillMatch(skillA, skillB) {
        const a = this.normalize(skillA);
        const b = this.normalize(skillB);
        if (!a || !b) return false;

        // Exact match
        if (a === b) return true;

        // Substring match
        if (a.includes(b) || b.includes(a)) return true;

        // Synonym match
        for (const [key, list] of Object.entries(this.synonyms)) {
            const group = [key, ...list];
            const hasA = group.some(item => a.includes(item) || item.includes(a));
            const hasB = group.some(item => b.includes(item) || item.includes(b));
            if (hasA && hasB) return true;
        }

        return false;
    },

    // Calculate match score between a student profile and a job
    calculateMatch(studentProfile, job) {
        if (!studentProfile || !job) {
            return {
                score: 0,
                matchedSkills: [],
                missingSkills: [],
                matchLevel: 'ไม่มีข้อมูล',
                badgeClass: 'badge-gray'
            };
        }

        const studentSkills = Array.isArray(studentProfile.skills) ? studentProfile.skills : [];
        const requiredSkills = Array.isArray(job.required_skills) ? job.required_skills : [];

        // If job specifies no required skills, base score on general openness
        if (requiredSkills.length === 0) {
            return {
                score: 80,
                matchedSkills: studentSkills.slice(0, 3),
                missingSkills: [],
                matchLevel: 'เปิดรับทั่วไป',
                badgeClass: 'badge-blue'
            };
        }

        const matchedSkills = [];
        const missingSkills = [];

        requiredSkills.forEach(reqSkill => {
            const hasMatch = studentSkills.some(studSkill => this.isSkillMatch(reqSkill, studSkill));
            if (hasMatch) {
                matchedSkills.push(reqSkill);
            } else {
                missingSkills.push(reqSkill);
            }
        });

        // Skill ratio (weight: 85%)
        const skillRatio = matchedSkills.length / requiredSkills.length;
        let score = Math.round(skillRatio * 85);

        // Faculty / Interest bonus (weight: 15%)
        const studentFaculty = (studentProfile.faculty || '').toLowerCase();
        const jobDept = (job.department || '').toLowerCase();
        if (studentFaculty && jobDept && (jobDept.includes(studentFaculty) || studentFaculty.includes(jobDept))) {
            score += 10;
        }

        // Student interest bonus
        const interests = (studentProfile.interests || '').toLowerCase();
        const jobTitle = (job.title || '').toLowerCase();
        if (interests && jobTitle && interests.split(/[\s,]+/).some(w => w.length > 2 && jobTitle.includes(w))) {
            score += 5;
        }

        // Clamp between 10 and 100
        score = Math.max(10, Math.min(99, score));
        if (matchedSkills.length === requiredSkills.length && requiredSkills.length > 0) {
            score = 100;
        }

        let matchLevel = '';
        let badgeClass = '';

        if (score >= 90) {
            matchLevel = 'ยอดเยี่ยม (90%+)';
            badgeClass = 'badge-emerald';
        } else if (score >= 75) {
            matchLevel = 'เหมาะสมมาก (75-89%)';
            badgeClass = 'badge-blue';
        } else if (score >= 50) {
            matchLevel = 'เหมาะสมปานกลาง (50-74%)';
            badgeClass = 'badge-amber';
        } else {
            matchLevel = 'ทักษะพื้นฐาน (<50%)';
            badgeClass = 'badge-gray';
        }

        return {
            score,
            matchedSkills,
            missingSkills,
            matchLevel,
            badgeClass
        };
    },

    // Rank applicants for an instructor by matching score
    rankApplicants(applicantsWithProfiles, job) {
        return applicantsWithProfiles.map(item => {
            const matchResult = this.calculateMatch(item.studentProfile, job);
            return {
                ...item,
                calculatedScore: matchResult.score,
                matchDetails: matchResult
            };
        }).sort((a, b) => b.calculatedScore - a.calculatedScore);
    },

    // Rank jobs for a student by matching score
    rankJobsForStudent(studentProfile, jobs) {
        return jobs.map(job => {
            const matchResult = this.calculateMatch(studentProfile, job);
            return {
                ...job,
                matchResult
            };
        }).sort((a, b) => b.matchResult.score - a.matchResult.score);
    }
};
