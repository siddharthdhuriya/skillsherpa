// TypeScript mirror of supabase/migrations/0002_seed.sql, used by "local demo
// mode" (no Supabase credentials yet) so every page renders in development.
// Once a real Supabase project is connected this file is only used as a
// fallback and can eventually be removed.
//
// PLACEHOLDER DATA: commission rates, affiliate URLs/params, ratings, review
// counts, and prices are illustrative dummy values. Real commission rates must
// be confirmed against each platform's live affiliate agreement before launch.

import type { Category, Course, Platform } from "@/lib/database.types";

const NOW = "2026-01-15T00:00:00.000Z";

const P = (n: string) => `11111111-1111-1111-1111-1111111111${n}`;
const C = (n: string) => `22222222-2222-2222-2222-2222222222${n}`;

export const seedPlatforms: Platform[] = [
  { id: P("01"), name: "Coursera", website_url: "https://www.coursera.org", has_affiliate_program: true, commission_rate: 10, affiliate_network: "Direct", logo_url: null, created_at: NOW },
  { id: P("02"), name: "Udemy", website_url: "https://www.udemy.com", has_affiliate_program: true, commission_rate: 15, affiliate_network: "Cuelinks", logo_url: null, created_at: NOW },
  { id: P("03"), name: "Edureka", website_url: "https://www.edureka.co", has_affiliate_program: true, commission_rate: 20, affiliate_network: "Direct", logo_url: null, created_at: NOW },
  { id: P("04"), name: "MasterClass", website_url: "https://www.masterclass.com", has_affiliate_program: true, commission_rate: 25, affiliate_network: "Direct", logo_url: null, created_at: NOW },
  { id: P("05"), name: "Blinkist", website_url: "https://www.blinkist.com", has_affiliate_program: true, commission_rate: 30, affiliate_network: "Cuelinks", logo_url: null, created_at: NOW },
  { id: P("06"), name: "British Council", website_url: "https://www.britishcouncil.org", has_affiliate_program: true, commission_rate: 12, affiliate_network: "Direct", logo_url: null, created_at: NOW },
  { id: P("07"), name: "Rosetta Stone", website_url: "https://www.rosettastone.com", has_affiliate_program: true, commission_rate: 18, affiliate_network: "Cuelinks", logo_url: null, created_at: NOW },
  { id: P("08"), name: "LearnWorlds", website_url: "https://www.learnworlds.com", has_affiliate_program: true, commission_rate: 22, affiliate_network: "Direct", logo_url: null, created_at: NOW },
  { id: P("09"), name: "Education.com", website_url: "https://www.education.com", has_affiliate_program: true, commission_rate: 14, affiliate_network: "Cuelinks", logo_url: null, created_at: NOW },
  { id: P("10"), name: "Eventtrix", website_url: "https://www.eventtrix.com", has_affiliate_program: true, commission_rate: 16, affiliate_network: "Direct", logo_url: null, created_at: NOW },
  // Non-affiliate platform: exercises the admin gating. No courses allowed.
  { id: P("99"), name: "OpenLectures (no affiliate)", website_url: "https://example.org", has_affiliate_program: false, commission_rate: null, affiliate_network: null, logo_url: null, created_at: NOW },
];

export const seedCategories: Category[] = [
  {
    id: C("01"), name: "Data Science", slug: "data-science", parent_category_id: null, created_at: NOW,
    description: "Courses covering data analysis, machine learning, statistics, and AI from partner platforms.",
    seo_title: "Best Data Science Courses and Certifications (2026) | SkillSherpa",
    seo_description: "Compare top data science courses and certifications from Coursera, Udemy, Edureka and more. Ratings, prices, and duration side by side.",
  },
  {
    id: C("02"), name: "Web Development", slug: "web-development", parent_category_id: null, created_at: NOW,
    description: "Frontend, backend, and full-stack web development courses from partner platforms.",
    seo_title: "Best Web Development Courses Online (2026) | SkillSherpa",
    seo_description: "Find and compare the best web development courses online. Full-stack, JavaScript, React, and more, ranked by rating and value.",
  },
  {
    id: C("03"), name: "Language Learning", slug: "language-learning", parent_category_id: null, created_at: NOW,
    description: "Language courses and exam preparation, including IELTS, from partner platforms.",
    seo_title: "Best Online Language Courses and IELTS Prep (2026) | SkillSherpa",
    seo_description: "Compare online language learning courses and IELTS preparation from British Council, Rosetta Stone, and more.",
  },
  {
    id: C("04"), name: "Business & Leadership", slug: "business-leadership", parent_category_id: null, created_at: NOW,
    description: "Business strategy, leadership, marketing, and productivity courses from partner platforms.",
    seo_title: "Best Business and Leadership Courses Online (2026) | SkillSherpa",
    seo_description: "Compare business, leadership, and marketing courses from MasterClass, Blinkist, Udemy, and more partner platforms.",
  },
];

type SeedCourse = Omit<Course, "id" | "created_at" | "updated_at" | "currency" | "is_active" | "thumbnail_url"> &
  Partial<Pick<Course, "currency" | "is_active" | "thumbnail_url">>;

let courseSeq = 0;
function course(c: SeedCourse): Course {
  courseSeq += 1;
  return {
    id: `33333333-3333-3333-3333-3333333333${String(courseSeq).padStart(2, "0")}`,
    currency: "USD",
    is_active: true,
    thumbnail_url: null,
    created_at: NOW,
    updated_at: NOW,
    ...c,
  };
}

export const seedCourses: Course[] = [
  // --- Data Science ---
  course({
    platform_id: P("01"), category_id: C("01"), subcategory: "Certifications",
    title: "IBM Data Science Professional Certificate",
    slug: "ibm-data-science-professional-certificate",
    description: "A beginner-friendly professional certificate covering Python, SQL, data visualization, machine learning, and a capstone project with real datasets.",
    ai_summary: "A structured on-ramp into data science that assumes no prior experience. Over roughly four months of part-time study you move from Python basics through SQL, visualization, and applied machine learning, finishing with a portfolio capstone. Strong fit for career changers who want a recognized credential; less useful if you already code daily.",
    price_range: "paid", price_amount: 49, external_rating: 4.6, review_count: 128450,
    duration: "4 months", language: "English",
    enrollment_link: "https://www.coursera.org/professional-certificates/ibm-data-science?aff_id=PLACEHOLDER",
  }),
  course({
    platform_id: P("02"), category_id: C("01"), subcategory: "Machine Learning",
    title: "Python for Data Science and Machine Learning Bootcamp",
    slug: "python-data-science-machine-learning-bootcamp",
    description: "Hands-on bootcamp using NumPy, Pandas, Seaborn, Matplotlib, Scikit-Learn, and TensorFlow with dozens of coding exercises.",
    ai_summary: "A dense, exercise-driven bootcamp best suited to learners who already know basic Python and want to reach working proficiency with the standard data stack fast. Coverage is broad rather than deep: expect to leave able to build and evaluate common models, not to derive them.",
    price_range: "paid", price_amount: 19.99, external_rating: 4.6, review_count: 95230,
    duration: "25 hours", language: "English",
    enrollment_link: "https://www.udemy.com/course/python-for-data-science-and-machine-learning-bootcamp/?couponCode=PLACEHOLDER",
  }),
  course({
    platform_id: P("03"), category_id: C("01"), subcategory: "Certifications",
    title: "Data Science with Python Certification Training",
    slug: "edureka-data-science-python-certification",
    description: "Instructor-led live training covering statistics, Python, machine learning, and Spark, with weekend batches and lifetime LMS access.",
    ai_summary: "Live instructor-led cohorts distinguish this from self-paced alternatives: fixed weekend schedules, graded assignments, and direct Q&A. The trade-off is pace and price. Choose it if you need external structure and accountability; skip it if you learn well alone.",
    price_range: "paid", price_amount: 399, external_rating: 4.5, review_count: 18760,
    duration: "6 weeks", language: "English",
    enrollment_link: "https://www.edureka.co/data-science-python-certification-course?ref=PLACEHOLDER",
  }),
  course({
    platform_id: P("01"), category_id: C("01"), subcategory: "Machine Learning",
    title: "Machine Learning Specialization",
    slug: "machine-learning-specialization-stanford",
    description: "A foundational three-course specialization on supervised learning, advanced algorithms, and unsupervised learning, taught with practical labs.",
    ai_summary: "The canonical starting point for machine learning theory taught with unusual clarity. Math is introduced gently but not skipped, and the labs use modern Python tooling. Expect a genuine conceptual foundation rather than a toolkit tour; pair it with a project-based course afterward.",
    price_range: "paid", price_amount: 49, external_rating: 4.9, review_count: 31240,
    duration: "3 months", language: "English",
    enrollment_link: "https://www.coursera.org/specializations/machine-learning-introduction?aff_id=PLACEHOLDER",
  }),
  course({
    platform_id: P("02"), category_id: C("01"), subcategory: "Data Analysis",
    title: "SQL for Data Analysis: Beginner to Advanced",
    slug: "sql-for-data-analysis-beginner-advanced",
    description: "Practical SQL from SELECT basics through window functions, CTEs, and query optimization, using realistic business datasets.",
    ai_summary: "Focused, unglamorous, and extremely employable: this course drills the SQL you actually write in analytics roles. The progression from joins to window functions is well paced, and the business-flavored datasets make practice transfer directly to work. Minimal fluff.",
    price_range: "paid", price_amount: 14.99, external_rating: 4.7, review_count: 42110,
    duration: "18 hours", language: "English",
    enrollment_link: "https://www.udemy.com/course/sql-for-data-analysis/?couponCode=PLACEHOLDER",
  }),

  // --- Web Development ---
  course({
    platform_id: P("02"), category_id: C("02"), subcategory: "Full-Stack",
    title: "The Complete Web Development Bootcamp",
    slug: "complete-web-development-bootcamp",
    description: "Full-stack curriculum spanning HTML, CSS, JavaScript, Node.js, React, SQL, and web3 fundamentals with capstone projects.",
    ai_summary: "One course that takes a true beginner to deploying full-stack applications. Its strength is momentum: short lessons, constant building, and a large community when you get stuck. Its weakness is depth per topic, so treat it as a map of the territory you will revisit.",
    price_range: "paid", price_amount: 19.99, external_rating: 4.7, review_count: 389540,
    duration: "62 hours", language: "English",
    enrollment_link: "https://www.udemy.com/course/the-complete-web-development-bootcamp/?couponCode=PLACEHOLDER",
  }),
  course({
    platform_id: P("01"), category_id: C("02"), subcategory: "Frontend",
    title: "Meta Front-End Developer Professional Certificate",
    slug: "meta-front-end-developer-certificate",
    description: "A professional certificate covering HTML, CSS, JavaScript, React, UX principles, and interview preparation, built by Meta engineers.",
    ai_summary: "A credential-bearing path into frontend work with an unusually practical final third: coding interview prep and a portfolio project reviewed against industry rubrics. The React coverage tracks current practice. Best for job seekers who want structure plus a recognizable certificate.",
    price_range: "paid", price_amount: 49, external_rating: 4.7, review_count: 87320,
    duration: "7 months", language: "English",
    enrollment_link: "https://www.coursera.org/professional-certificates/meta-front-end-developer?aff_id=PLACEHOLDER",
  }),
  course({
    platform_id: P("08"), category_id: C("02"), subcategory: "No-Code",
    title: "Build and Sell Online Courses: Creator Platform Masterclass",
    slug: "learnworlds-course-creator-masterclass",
    description: "Learn to design, build, and launch a branded online academy without code, covering site building, video hosting, and payment setup.",
    ai_summary: "A niche but valuable skill set: turning expertise into a sellable online school. The course walks through information architecture, pricing pages, and checkout flows on a real platform. Most useful for coaches, trainers, and small businesses productizing knowledge.",
    price_range: "free", price_amount: null, external_rating: 4.4, review_count: 3210,
    duration: "8 hours", language: "English",
    enrollment_link: "https://www.learnworlds.com/academy/course-creator-masterclass?partner=PLACEHOLDER",
  }),
  course({
    platform_id: P("03"), category_id: C("02"), subcategory: "Full-Stack",
    title: "Full Stack Web Developer Masters Program",
    slug: "edureka-full-stack-masters-program",
    description: "Instructor-led masters program covering Java, Spring Boot, React, MongoDB, and DevOps basics across sequential live courses.",
    ai_summary: "The heavyweight option: a multi-course live program with the enterprise Java stack at its core rather than the JavaScript-everywhere approach most bootcamps take. Suits learners targeting large-company backend roles where Spring remains dominant.",
    price_range: "paid", price_amount: 549, external_rating: 4.4, review_count: 9870,
    duration: "20 weeks", language: "English",
    enrollment_link: "https://www.edureka.co/masters-program/full-stack-developer-training?ref=PLACEHOLDER",
  }),
  course({
    platform_id: P("02"), category_id: C("02"), subcategory: "Frontend",
    title: "React: The Complete Guide (incl. Next.js)",
    slug: "react-complete-guide-nextjs",
    description: "Deep React coverage from fundamentals through hooks, Redux, testing, and Next.js server components, continuously updated.",
    ai_summary: "The reference course for React depth. It is long because it is thorough: state management, testing, and the server-components mental model each get real treatment rather than a demo. Beginners can start here, but the second half rewards prior JavaScript fluency.",
    price_range: "paid", price_amount: 19.99, external_rating: 4.6, review_count: 218330,
    duration: "68 hours", language: "English",
    enrollment_link: "https://www.udemy.com/course/react-the-complete-guide-incl-redux/?couponCode=PLACEHOLDER",
  }),

  // --- Language Learning ---
  course({
    platform_id: P("06"), category_id: C("03"), subcategory: "IELTS",
    title: "IELTS Coach: Complete Preparation Course",
    slug: "british-council-ielts-coach",
    description: "Official IELTS preparation from the exam co-owner, covering all four papers with practice tests, tutor feedback, and study plans.",
    ai_summary: "Preparation material from the organization that co-owns the exam, which shows in how precisely the practice tasks mirror real scoring criteria. The tutor-feedback tiers are the differentiator: writing and speaking are where self-study fails, and this addresses both directly.",
    price_range: "paid", price_amount: 44, external_rating: 4.8, review_count: 21540,
    duration: "30 hours", language: "English",
    enrollment_link: "https://www.britishcouncil.org/exam/ielts/coach?aff=PLACEHOLDER",
  }),
  course({
    platform_id: P("07"), category_id: C("03"), subcategory: "Spanish",
    title: "Rosetta Stone Spanish (Latin America): Full Program",
    slug: "rosetta-stone-spanish-latin-america",
    description: "Immersion-method Spanish program with speech recognition feedback, live tutoring options, and offline mobile lessons.",
    ai_summary: "Pure immersion with no translation crutch: you learn Spanish in Spanish from the first screen, with speech recognition correcting pronunciation as you go. Strongest for building listening and speaking instincts; supplement with a grammar reference if you want explicit rules.",
    price_range: "paid", price_amount: 11.99, external_rating: 4.5, review_count: 67890,
    duration: "Self-paced", language: "Spanish",
    enrollment_link: "https://www.rosettastone.com/buy/spanish-latin-america?affid=PLACEHOLDER",
  }),
  course({
    platform_id: P("06"), category_id: C("03"), subcategory: "English",
    title: "English Online: Live Group Classes",
    slug: "british-council-english-online-live",
    description: "Live small-group English classes with certified teachers, flexible scheduling across time zones, and a personal study plan.",
    ai_summary: "Live teacher-led classes in groups small enough that you actually speak every session. The scheduling flexibility across time zones is genuinely useful for working learners. This is conversation-first English; test-focused learners should look at the IELTS offering instead.",
    price_range: "paid", price_amount: 139, external_rating: 4.7, review_count: 8430,
    duration: "12 weeks", language: "English",
    enrollment_link: "https://www.britishcouncil.org/english-online?aff=PLACEHOLDER",
  }),
  course({
    platform_id: P("07"), category_id: C("03"), subcategory: "Japanese",
    title: "Rosetta Stone Japanese: Foundations to Conversation",
    slug: "rosetta-stone-japanese-foundations",
    description: "Immersion-based Japanese covering hiragana and katakana reading, core grammar patterns, and conversational speech with pronunciation scoring.",
    ai_summary: "Immersion works differently for Japanese than for European languages, and this program adapts sensibly: script reading is layered in early and the speech engine handles pitch accent better than most competitors. Kanji coverage is light, so plan a dedicated kanji tool alongside.",
    price_range: "paid", price_amount: 11.99, external_rating: 4.4, review_count: 23120,
    duration: "Self-paced", language: "Japanese",
    enrollment_link: "https://www.rosettastone.com/buy/japanese?affid=PLACEHOLDER",
  }),

  // --- Business & Leadership ---
  course({
    platform_id: P("04"), category_id: C("04"), subcategory: "Entrepreneurship",
    title: "Sara Blakely Teaches Self-Made Entrepreneurship",
    slug: "sara-blakely-self-made-entrepreneurship",
    description: "The Spanx founder on bootstrapping, product development, selling before scaling, and building a brand customers evangelize.",
    ai_summary: "Less a curriculum than a founder downloading two decades of hard-won judgment: how to test products cheaply, sell before you build, and protect equity while bootstrapping. Watch it for calibration and conviction, not for spreadsheets; it pairs well with a tactical startup course.",
    price_range: "paid", price_amount: 10, external_rating: 4.7, review_count: 12890,
    duration: "3.5 hours", language: "English",
    enrollment_link: "https://www.masterclass.com/classes/sara-blakely-teaches-self-made-entrepreneurship?utm_source=PLACEHOLDER",
  }),
  course({
    platform_id: P("05"), category_id: C("04"), subcategory: "Leadership",
    title: "Blinkist Premium: Business & Leadership Collection",
    slug: "blinkist-business-leadership-collection",
    description: "Key insights from thousands of business and leadership nonfiction titles in 15-minute reads and audio, with curated learning paths.",
    ai_summary: "Not a course but a compression layer over the business bookshelf: fifteen-minute distillations you can queue like podcasts. Best used as a filter, reading summaries widely and buying only the books that earn a full read. The curated leadership paths keep it from being aimless grazing.",
    price_range: "paid", price_amount: 7.49, external_rating: 4.5, review_count: 108760,
    duration: "Self-paced", language: "English",
    enrollment_link: "https://www.blinkist.com/en/business-collection?utm_source=PLACEHOLDER",
  }),
  course({
    platform_id: P("10"), category_id: C("04"), subcategory: "Event Management",
    title: "Event Planning and Management Certification",
    slug: "eventtrix-event-planning-certification",
    description: "Accredited certification covering event budgeting, vendor management, marketing, and on-the-day logistics for aspiring planners.",
    ai_summary: "A compact, credential-bearing route into event planning that covers the unglamorous parts competitors skip: budget templates, vendor contracts, and contingency planning. The certification is entry-level, so treat it as a door-opener plus vocabulary, not a substitute for on-site experience.",
    price_range: "paid", price_amount: 29, external_rating: 4.3, review_count: 5670,
    duration: "15 hours", language: "English",
    enrollment_link: "https://www.eventtrix.com/courses/event-planning?ref=PLACEHOLDER",
  }),
  course({
    platform_id: P("09"), category_id: C("04"), subcategory: "Finance",
    title: "Teaching Kids Financial Literacy: Educator Toolkit",
    slug: "education-com-financial-literacy-toolkit",
    description: "Lesson plans, printable worksheets, and guided activities for teaching children money basics, budgeting, and saving habits.",
    ai_summary: "Aimed at parents and teachers rather than the kids themselves: ready-to-use lesson plans and worksheets that turn money concepts into games and activities by age band. The pedagogy is sound and prep time is near zero. Adults seeking their own finance education should look elsewhere.",
    price_range: "free", price_amount: null, external_rating: 4.6, review_count: 14320,
    duration: "Self-paced", language: "English",
    enrollment_link: "https://www.education.com/resources/financial-literacy/?ref=PLACEHOLDER",
  }),
];
