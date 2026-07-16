-- SkillSherpa seed data
-- All courses below are attached to platforms with has_affiliate_program = true.
-- PLACEHOLDER DATA: commission rates, affiliate URLs/params, ratings, review
-- counts, and prices are illustrative dummy values for development. Real
-- commission rates and tracking parameters must be confirmed against each
-- platform's live affiliate agreement before launch.

-- ---------------------------------------------------------------------------
-- Platforms
-- ---------------------------------------------------------------------------
insert into public.platforms (id, name, website_url, has_affiliate_program, commission_rate, affiliate_network) values
  ('11111111-1111-1111-1111-111111111101', 'Coursera',        'https://www.coursera.org',       true,  10.00, 'Direct'),
  ('11111111-1111-1111-1111-111111111102', 'Udemy',           'https://www.udemy.com',          true,  15.00, 'Cuelinks'),
  ('11111111-1111-1111-1111-111111111103', 'Edureka',         'https://www.edureka.co',         true,  20.00, 'Direct'),
  ('11111111-1111-1111-1111-111111111104', 'MasterClass',     'https://www.masterclass.com',    true,  25.00, 'Direct'),
  ('11111111-1111-1111-1111-111111111105', 'Blinkist',        'https://www.blinkist.com',       true,  30.00, 'Cuelinks'),
  ('11111111-1111-1111-1111-111111111106', 'British Council', 'https://www.britishcouncil.org', true,  12.00, 'Direct'),
  ('11111111-1111-1111-1111-111111111107', 'Rosetta Stone',   'https://www.rosettastone.com',   true,  18.00, 'Cuelinks'),
  ('11111111-1111-1111-1111-111111111108', 'LearnWorlds',     'https://www.learnworlds.com',    true,  22.00, 'Direct'),
  ('11111111-1111-1111-1111-111111111109', 'Education.com',   'https://www.education.com',      true,  14.00, 'Cuelinks'),
  ('11111111-1111-1111-1111-111111111110', 'Eventtrix',       'https://www.eventtrix.com',      true,  16.00, 'Direct'),
  -- Non-affiliate platform: exists so the admin UI gating can be exercised in
  -- development. It has no courses and none can be added (DB trigger).
  ('11111111-1111-1111-1111-111111111199', 'OpenLectures (no affiliate)', 'https://example.org', false, null, null);

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
insert into public.categories (id, name, slug, description, seo_title, seo_description) values
  ('22222222-2222-2222-2222-222222222201', 'Data Science', 'data-science',
   'Courses covering data analysis, machine learning, statistics, and AI from partner platforms.',
   'Best Data Science Courses and Certifications (2026) | SkillSherpa',
   'Compare top data science courses and certifications from Coursera, Udemy, Edureka and more. Ratings, prices, and duration side by side.'),
  ('22222222-2222-2222-2222-222222222202', 'Web Development', 'web-development',
   'Frontend, backend, and full-stack web development courses from partner platforms.',
   'Best Web Development Courses Online (2026) | SkillSherpa',
   'Find and compare the best web development courses online. Full-stack, JavaScript, React, and more, ranked by rating and value.'),
  ('22222222-2222-2222-2222-222222222203', 'Language Learning', 'language-learning',
   'Language courses and exam preparation, including IELTS, from partner platforms.',
   'Best Online Language Courses and IELTS Prep (2026) | SkillSherpa',
   'Compare online language learning courses and IELTS preparation from British Council, Rosetta Stone, and more.'),
  ('22222222-2222-2222-2222-222222222204', 'Business & Leadership', 'business-leadership',
   'Business strategy, leadership, marketing, and productivity courses from partner platforms.',
   'Best Business and Leadership Courses Online (2026) | SkillSherpa',
   'Compare business, leadership, and marketing courses from MasterClass, Blinkist, Udemy, and more partner platforms.');

-- ---------------------------------------------------------------------------
-- Courses (18) — enrollment_link values carry PLACEHOLDER affiliate params.
-- ---------------------------------------------------------------------------
insert into public.courses
  (platform_id, title, slug, category_id, subcategory, offered_by, description, ai_summary, price_range, price_amount, currency, external_rating, review_count, duration, language, enrollment_link) values

-- Data Science
('11111111-1111-1111-1111-111111111101', 'IBM Data Science Professional Certificate', 'ibm-data-science-professional-certificate',
 '22222222-2222-2222-2222-222222222201', 'Certifications',
 'IBM Skills Network',
 'A beginner-friendly professional certificate covering Python, SQL, data visualization, machine learning, and a capstone project with real datasets.',
 'A structured on-ramp into data science that assumes no prior experience. Over roughly four months of part-time study you move from Python basics through SQL, visualization, and applied machine learning, finishing with a portfolio capstone. Strong fit for career changers who want a recognized credential; less useful if you already code daily.',
 'paid', 49.00, 'USD', 4.6, 128450, '4 months', 'English',
 'https://www.coursera.org/professional-certificates/ibm-data-science?aff_id=PLACEHOLDER'),

('11111111-1111-1111-1111-111111111102', 'Python for Data Science and Machine Learning Bootcamp', 'python-data-science-machine-learning-bootcamp',
 '22222222-2222-2222-2222-222222222201', 'Machine Learning',
 NULL,
 'Hands-on bootcamp using NumPy, Pandas, Seaborn, Matplotlib, Scikit-Learn, and TensorFlow with dozens of coding exercises.',
 'A dense, exercise-driven bootcamp best suited to learners who already know basic Python and want to reach working proficiency with the standard data stack fast. Coverage is broad rather than deep: expect to leave able to build and evaluate common models, not to derive them.',
 'paid', 19.99, 'USD', 4.6, 95230, '25 hours', 'English',
 'https://www.udemy.com/course/python-for-data-science-and-machine-learning-bootcamp/?couponCode=PLACEHOLDER'),

('11111111-1111-1111-1111-111111111103', 'Data Science with Python Certification Training', 'edureka-data-science-python-certification',
 '22222222-2222-2222-2222-222222222201', 'Certifications',
 NULL,
 'Instructor-led live training covering statistics, Python, machine learning, and Spark, with weekend batches and lifetime LMS access.',
 'Live instructor-led cohorts distinguish this from self-paced alternatives: fixed weekend schedules, graded assignments, and direct Q&A. The trade-off is pace and price. Choose it if you need external structure and accountability; skip it if you learn well alone.',
 'paid', 399.00, 'USD', 4.5, 18760, '6 weeks', 'English',
 'https://www.edureka.co/data-science-python-certification-course?ref=PLACEHOLDER'),

('11111111-1111-1111-1111-111111111101', 'Machine Learning Specialization', 'machine-learning-specialization-stanford',
 '22222222-2222-2222-2222-222222222201', 'Machine Learning',
 'Stanford University and DeepLearning.AI',
 'A foundational three-course specialization on supervised learning, advanced algorithms, and unsupervised learning, taught with practical labs.',
 'The canonical starting point for machine learning theory taught with unusual clarity. Math is introduced gently but not skipped, and the labs use modern Python tooling. Expect a genuine conceptual foundation rather than a toolkit tour; pair it with a project-based course afterward.',
 'paid', 49.00, 'USD', 4.9, 31240, '3 months', 'English',
 'https://www.coursera.org/specializations/machine-learning-introduction?aff_id=PLACEHOLDER'),

('11111111-1111-1111-1111-111111111102', 'SQL for Data Analysis: Beginner to Advanced', 'sql-for-data-analysis-beginner-advanced',
 '22222222-2222-2222-2222-222222222201', 'Data Analysis',
 NULL,
 'Practical SQL from SELECT basics through window functions, CTEs, and query optimization, using realistic business datasets.',
 'Focused, unglamorous, and extremely employable: this course drills the SQL you actually write in analytics roles. The progression from joins to window functions is well paced, and the business-flavored datasets make practice transfer directly to work. Minimal fluff.',
 'paid', 14.99, 'USD', 4.7, 42110, '18 hours', 'English',
 'https://www.udemy.com/course/sql-for-data-analysis/?couponCode=PLACEHOLDER'),

-- Web Development
('11111111-1111-1111-1111-111111111102', 'The Complete Web Development Bootcamp', 'complete-web-development-bootcamp',
 '22222222-2222-2222-2222-222222222202', 'Full-Stack',
 NULL,
 'Full-stack curriculum spanning HTML, CSS, JavaScript, Node.js, React, SQL, and web3 fundamentals with capstone projects.',
 'One course that takes a true beginner to deploying full-stack applications. Its strength is momentum: short lessons, constant building, and a large community when you get stuck. Its weakness is depth per topic, so treat it as a map of the territory you will revisit.',
 'paid', 19.99, 'USD', 4.7, 389540, '62 hours', 'English',
 'https://www.udemy.com/course/the-complete-web-development-bootcamp/?couponCode=PLACEHOLDER'),

('11111111-1111-1111-1111-111111111101', 'Meta Front-End Developer Professional Certificate', 'meta-front-end-developer-certificate',
 '22222222-2222-2222-2222-222222222202', 'Frontend',
 'Meta',
 'A professional certificate covering HTML, CSS, JavaScript, React, UX principles, and interview preparation, built by Meta engineers.',
 'A credential-bearing path into frontend work with an unusually practical final third: coding interview prep and a portfolio project reviewed against industry rubrics. The React coverage tracks current practice. Best for job seekers who want structure plus a recognizable certificate.',
 'paid', 49.00, 'USD', 4.7, 87320, '7 months', 'English',
 'https://www.coursera.org/professional-certificates/meta-front-end-developer?aff_id=PLACEHOLDER'),

('11111111-1111-1111-1111-111111111108', 'Build and Sell Online Courses: Creator Platform Masterclass', 'learnworlds-course-creator-masterclass',
 '22222222-2222-2222-2222-222222222202', 'No-Code',
 NULL,
 'Learn to design, build, and launch a branded online academy without code, covering site building, video hosting, and payment setup.',
 'A niche but valuable skill set: turning expertise into a sellable online school. The course walks through information architecture, pricing pages, and checkout flows on a real platform. Most useful for coaches, trainers, and small businesses productizing knowledge.',
 'free', null, 'USD', 4.4, 3210, '8 hours', 'English',
 'https://www.learnworlds.com/academy/course-creator-masterclass?partner=PLACEHOLDER'),

('11111111-1111-1111-1111-111111111103', 'Full Stack Web Developer Masters Program', 'edureka-full-stack-masters-program',
 '22222222-2222-2222-2222-222222222202', 'Full-Stack',
 NULL,
 'Instructor-led masters program covering Java, Spring Boot, React, MongoDB, and DevOps basics across sequential live courses.',
 'The heavyweight option: a multi-course live program with the enterprise Java stack at its core rather than the JavaScript-everywhere approach most bootcamps take. Suits learners targeting large-company backend roles where Spring remains dominant.',
 'paid', 549.00, 'USD', 4.4, 9870, '20 weeks', 'English',
 'https://www.edureka.co/masters-program/full-stack-developer-training?ref=PLACEHOLDER'),

('11111111-1111-1111-1111-111111111102', 'React: The Complete Guide (incl. Next.js)', 'react-complete-guide-nextjs',
 '22222222-2222-2222-2222-222222222202', 'Frontend',
 NULL,
 'Deep React coverage from fundamentals through hooks, Redux, testing, and Next.js server components, continuously updated.',
 'The reference course for React depth. It is long because it is thorough: state management, testing, and the server-components mental model each get real treatment rather than a demo. Beginners can start here, but the second half rewards prior JavaScript fluency.',
 'paid', 19.99, 'USD', 4.6, 218330, '68 hours', 'English',
 'https://www.udemy.com/course/react-the-complete-guide-incl-redux/?couponCode=PLACEHOLDER'),

-- Language Learning
('11111111-1111-1111-1111-111111111106', 'IELTS Coach: Complete Preparation Course', 'british-council-ielts-coach',
 '22222222-2222-2222-2222-222222222203', 'IELTS',
 NULL,
 'Official IELTS preparation from the exam co-owner, covering all four papers with practice tests, tutor feedback, and study plans.',
 'Preparation material from the organization that co-owns the exam, which shows in how precisely the practice tasks mirror real scoring criteria. The tutor-feedback tiers are the differentiator: writing and speaking are where self-study fails, and this addresses both directly.',
 'paid', 44.00, 'USD', 4.8, 21540, '30 hours', 'English',
 'https://www.britishcouncil.org/exam/ielts/coach?aff=PLACEHOLDER'),

('11111111-1111-1111-1111-111111111107', 'Rosetta Stone Spanish (Latin America): Full Program', 'rosetta-stone-spanish-latin-america',
 '22222222-2222-2222-2222-222222222203', 'Spanish',
 NULL,
 'Immersion-method Spanish program with speech recognition feedback, live tutoring options, and offline mobile lessons.',
 'Pure immersion with no translation crutch: you learn Spanish in Spanish from the first screen, with speech recognition correcting pronunciation as you go. Strongest for building listening and speaking instincts; supplement with a grammar reference if you want explicit rules.',
 'paid', 11.99, 'USD', 4.5, 67890, 'Self-paced', 'Spanish',
 'https://www.rosettastone.com/buy/spanish-latin-america?affid=PLACEHOLDER'),

('11111111-1111-1111-1111-111111111106', 'English Online: Live Group Classes', 'british-council-english-online-live',
 '22222222-2222-2222-2222-222222222203', 'English',
 NULL,
 'Live small-group English classes with certified teachers, flexible scheduling across time zones, and a personal study plan.',
 'Live teacher-led classes in groups small enough that you actually speak every session. The scheduling flexibility across time zones is genuinely useful for working learners. This is conversation-first English; test-focused learners should look at the IELTS offering instead.',
 'paid', 139.00, 'USD', 4.7, 8430, '12 weeks', 'English',
 'https://www.britishcouncil.org/english-online?aff=PLACEHOLDER'),

('11111111-1111-1111-1111-111111111107', 'Rosetta Stone Japanese: Foundations to Conversation', 'rosetta-stone-japanese-foundations',
 '22222222-2222-2222-2222-222222222203', 'Japanese',
 NULL,
 'Immersion-based Japanese covering hiragana and katakana reading, core grammar patterns, and conversational speech with pronunciation scoring.',
 'Immersion works differently for Japanese than for European languages, and this program adapts sensibly: script reading is layered in early and the speech engine handles pitch accent better than most competitors. Kanji coverage is light, so plan a dedicated kanji tool alongside.',
 'paid', 11.99, 'USD', 4.4, 23120, 'Self-paced', 'Japanese',
 'https://www.rosettastone.com/buy/japanese?affid=PLACEHOLDER'),

-- Business & Leadership
('11111111-1111-1111-1111-111111111104', 'Sara Blakely Teaches Self-Made Entrepreneurship', 'sara-blakely-self-made-entrepreneurship',
 '22222222-2222-2222-2222-222222222204', 'Entrepreneurship',
 NULL,
 'The Spanx founder on bootstrapping, product development, selling before scaling, and building a brand customers evangelize.',
 'Less a curriculum than a founder downloading two decades of hard-won judgment: how to test products cheaply, sell before you build, and protect equity while bootstrapping. Watch it for calibration and conviction, not for spreadsheets; it pairs well with a tactical startup course.',
 'paid', 10.00, 'USD', 4.7, 12890, '3.5 hours', 'English',
 'https://www.masterclass.com/classes/sara-blakely-teaches-self-made-entrepreneurship?utm_source=PLACEHOLDER'),

('11111111-1111-1111-1111-111111111105', 'Blinkist Premium: Business & Leadership Collection', 'blinkist-business-leadership-collection',
 '22222222-2222-2222-2222-222222222204', 'Leadership',
 NULL,
 'Key insights from thousands of business and leadership nonfiction titles in 15-minute reads and audio, with curated learning paths.',
 'Not a course but a compression layer over the business bookshelf: fifteen-minute distillations you can queue like podcasts. Best used as a filter, reading summaries widely and buying only the books that earn a full read. The curated leadership paths keep it from being aimless grazing.',
 'paid', 7.49, 'USD', 4.5, 108760, 'Self-paced', 'English',
 'https://www.blinkist.com/en/business-collection?utm_source=PLACEHOLDER'),

('11111111-1111-1111-1111-111111111110', 'Event Planning and Management Certification', 'eventtrix-event-planning-certification',
 '22222222-2222-2222-2222-222222222204', 'Event Management',
 NULL,
 'Accredited certification covering event budgeting, vendor management, marketing, and on-the-day logistics for aspiring planners.',
 'A compact, credential-bearing route into event planning that covers the unglamorous parts competitors skip: budget templates, vendor contracts, and contingency planning. The certification is entry-level, so treat it as a door-opener plus vocabulary, not a substitute for on-site experience.',
 'paid', 29.00, 'USD', 4.3, 5670, '15 hours', 'English',
 'https://www.eventtrix.com/courses/event-planning?ref=PLACEHOLDER'),

('11111111-1111-1111-1111-111111111109', 'Teaching Kids Financial Literacy: Educator Toolkit', 'education-com-financial-literacy-toolkit',
 '22222222-2222-2222-2222-222222222204', 'Finance',
 NULL,
 'Lesson plans, printable worksheets, and guided activities for teaching children money basics, budgeting, and saving habits.',
 'Aimed at parents and teachers rather than the kids themselves: ready-to-use lesson plans and worksheets that turn money concepts into games and activities by age band. The pedagogy is sound and prep time is near zero. Adults seeking their own finance education should look elsewhere.',
 'free', null, 'USD', 4.6, 14320, 'Self-paced', 'English',
 'https://www.education.com/resources/financial-literacy/?ref=PLACEHOLDER');
