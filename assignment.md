# Voyage Travel Planner Project Report

Author: [Insert your name]

Student ID: [Insert student ID]

Module: [Insert module name]

Supervisor: [Insert supervisor name]

Submission Date: [Insert date]

This report is based on the implemented Voyage Travel Planner system in this repository. Personal details, final evaluation results, and IEEE references should be completed before submission.

## 1. Introduction

Voyage Travel Planner is a full-stack travel planning web application designed to help users discover destinations, create itineraries, manage bookings, save favourites, contact support, and access administrative travel management features through a single platform. The project combines a React and TypeScript frontend with a Node.js and Express backend, structured database access, session-based authentication, and personalised travel recommendation features. The motivation for the project emerged from the fragmentation that still characterises much of the online travel planning experience. Travellers commonly move between multiple platforms for inspiration, accommodation research, itinerary planning, booking management, and customer support. This introduces duplicated effort, inconsistent information, and a high cognitive load for users who are trying to make coherent travel decisions under time, budget, and schedule constraints.

The problem addressed by this project is the lack of an integrated and user-friendly system that brings together destination discovery, personalised planning, operational travel management, and support workflows. The people affected by this problem include leisure travellers, students planning international trips, families coordinating multi-day travel, and administrators or travel support staff who need visibility over customer records and travel activity. The problem typically occurs during the pre-trip planning phase, but it can also continue during the trip itself when users need to amend itineraries, review bookings, or contact support regarding changes. The problem is important because travel decisions are time-sensitive, financially significant, and highly dependent on accurate and accessible information. A poor planning workflow can result in missed reservations, inefficient schedules, weak personalisation, and reduced confidence in the platform.

This project therefore investigates the question: how can an AI-enhanced travel planning platform be designed and implemented to support destination discovery, itinerary management, booking oversight, and support communication within a single cohesive system? The project is not only concerned with technical feasibility, but also with usability, reliability, privacy, and maintainability. Rather than creating a simple brochure website, the aim was to build a working software artefact that demonstrates a realistic multi-user travel planning workflow.

The main aims of the project are as follows.

1. To design and develop a unified travel planning platform that reduces fragmentation across destination discovery, itinerary building, booking management, and support communication.
2. To integrate AI-driven recommendation features in a way that improves inspiration and exploration without replacing core user control.
3. To implement a maintainable full-stack architecture that supports secure authentication, administrative oversight, and future feature extension.

The objectives used to achieve these aims were more concrete and implementation-focused.

1. To build a responsive frontend interface using React and TypeScript for core user journeys such as sign-up, login, destination browsing, profile management, itinerary creation, and contact submission.
2. To develop a backend API using Express and TypeScript for user management, destinations, itineraries, bookings, blog content, favourites, and support messages.
3. To design and integrate a database-backed persistence layer, supported by repository modules and migration files, for structured travel data management.
4. To implement session-based authentication and role-based access control so that normal users and administrators have different permissions and routes.
5. To add personalised destination and travel recommendation features using Google Gemini and search-based service integration where appropriate.
6. To provide an administrative dashboard for reviewing users, trips, destinations, bookings, and contact submissions.
7. To evaluate the implemented artefact against project aims, technical requirements, and user-facing quality criteria.

Legal considerations are significant for this project because the system processes user account data, travel plans, support messages, and potentially booking-related details. This creates obligations around data protection and privacy legislation such as the UK GDPR and Data Protection Act 2018 if the system were deployed in a UK educational or commercial setting. Passwords must be securely handled, data collection should be minimised, and users should understand what information is stored and why. The codebase already shows awareness of security concerns through hashed passwords, sessions, validation, rate limiting, and HTTP security middleware, but a production deployment would also require a formal privacy notice, retention policy, access controls, audit procedures, and safe secret management.

Social considerations arise because travel platforms influence how users explore destinations, compare options, and form expectations. Systems that over-emphasise premium destinations or highly personalised recommendations can unintentionally reinforce commercial or cultural bias. Accessibility is also socially relevant because travel planning tools should be usable by people with different levels of technical literacy and different access needs. The project addresses social value by centralising travel tasks and simplifying navigation, although further accessibility testing and inclusive design review would be needed before release.

Ethical considerations concern the use of automated recommendation and content support within the platform. These features can improve inspiration and efficiency, but they can also produce inaccurate, outdated, or biased suggestions. For that reason, the system should be treated as a decision-support tool rather than an autonomous travel agent. Ethical development in this context means being transparent about how recommendations are produced, validating important operational data such as prices or availability against trusted sources, and avoiding the presentation of suggested content as guaranteed factual information. If formal user testing with participants was conducted for this project, the relevant ethics approval details should be inserted here. If no formal ethical clearance was required, that should be stated clearly with reference to the project scope and the safeguards used during evaluation.

Professional considerations include secure coding practice, version control, requirements tracing, testing discipline, and honest reporting. A professionally conducted computing project should document assumptions, avoid fabricated evidence, use references correctly, and present limitations openly. For that reason, the report distinguishes clearly between implemented features and evaluation results that still need to be added.

In terms of background, digital travel planning has evolved from static destination websites to highly interactive platforms that combine search, maps, reviews, bookings, and recommendation systems. Research and industry practice both show that users expect convenience, personalisation, and mobile-friendly interaction. At the same time, travel planning remains cognitively demanding because users must compare destinations, dates, budget constraints, activity choices, and support options across multiple services. Recent advances in recommendation and generative technologies have introduced new possibilities for itinerary assistance and personalised suggestions, but they also raise questions about trustworthiness, transparency, and integration with conventional booking workflows. Voyage Travel Planner sits in this context by attempting to combine conventional travel management functions with lightweight recommendation support inside one application. Relevant academic and industry sources on travel recommender systems, human-computer interaction, web application security, and full-stack architecture should be cited here using verified IEEE references. Suggested topics for citation include recommender systems in tourism, usability heuristics, secure session management, and AI reliability in consumer applications.

This report is structured as follows. Section 2 reviews relevant literature and compares the technologies considered for the project. Section 3 explains the methodology used to design, develop, test, and manage the work. Section 4 describes the implementation of the final artefact, including the frontend, backend, data layer, authentication, and recommendation features. Section 5 evaluates the resulting system, compares it with related work, and reflects on strengths and limitations. Section 6 concludes the report, summarises the extent to which the aims and objectives were met, and outlines reflection and future work. Sections 7 and 8 provide references and appendices.

## 2. Literature and Technology Review

### 2.1 Literature Review

The literature relevant to this project spans four overlapping themes: travel recommender systems, full-stack web platform usability, administrative information management, and trustworthy use of AI in consumer applications. In travel-related literature, recommendation systems are often described as mechanisms for reducing information overload and improving personalisation when users are selecting destinations, attractions, accommodation, or routes. Classical recommendation methods include content-based filtering, collaborative filtering, rule-based personalisation, and hybrid approaches. For this project, the key insight is not that one algorithm must be reproduced exactly, but that the system should help users narrow choices without removing user agency.

Usability literature is also important because travel planning involves multi-step tasks, cross-page navigation, date-sensitive input, and decision-making under uncertainty. Principles such as consistency, visibility of system status, error prevention, user control, and reduced memory load are directly applicable. Voyage Travel Planner reflects these principles through route-based separation of features, clear admin and user flows, confirmation patterns for destructive actions, and structured forms for trips and contact messages. However, the codebase also suggests the need for more formal usability evaluation with intended users, especially for itinerary creation and booking-status workflows.

Another relevant body of work concerns information systems used by administrators or service operators. Travel platforms are not purely end-user products; they also require back-office functionality for reviewing messages, moderating content, inspecting trips, and maintaining destination data. Literature on dashboard design and management systems highlights the importance of search, filtering, summarised indicators, role separation, and low-friction task completion. These ideas are reflected in the project's administrative dashboard, which aggregates users, trips, bookings, destinations, and support messages into one control surface.

The final major literature area concerns AI assistance and generative systems. Current literature often identifies a trade-off between convenience and trust. These systems can quickly produce recommendations, descriptive content, and structured results, but hallucinations and unverifiable details remain a concern. This is especially relevant in tourism and travel, where wrong information can have practical consequences. For this reason, the project uses automated recommendation features as an assistive layer rather than the sole source of truth for account or booking records. Core system data such as users, itineraries, bookings, and support messages are handled through the application's own persistence and validation logic, while recommendation features are mainly used to support discovery and travel planning.

Across these themes, the literature suggests that a strong travel platform should meet at least five criteria: it should reduce information overload, preserve user control, remain usable across multi-step tasks, provide reliable backend management, and clearly delimit the role of AI. These conclusions directly informed the design of this project.

### 2.2 Technology Review

The project required decisions across the frontend, backend, persistence, validation, authentication, and AI integration layers.

For the frontend, the main options considered were a traditional server-rendered stack, a modern component-based single-page application framework such as React, or an alternative framework such as Vue or Angular. React was selected because it supports modular component composition, has a strong TypeScript ecosystem, integrates cleanly with Vite, and is well suited to route-heavy interactive applications. Vite was preferred over heavier build tooling because it offers fast development startup and a relatively simple configuration model, which is beneficial within an academic project timescale.

For the backend, the main options were a frontend-only architecture relying entirely on third-party services, a serverless approach, or a dedicated Node.js backend. Express with TypeScript was selected because it offers direct control over routing, validation, middleware, sessions, and repository organisation. This was important because the project needed role-based access control, administrative endpoints, and multiple domain entities.

For persistence, the repository shows evidence of both Firebase-related code and a SQL-backed server design with migrations and repositories. This suggests that an early or parallel architecture used Firebase/Firestore while the main backend evolved toward structured SQL persistence with local fallback behaviour in some frontend services. A relational database approach is appropriate for this project because users, itineraries, bookings, contact messages, and destinations have clear structured relationships and administrative reporting needs. MySQL-compatible tooling therefore provides a better fit for transactional consistency and relational querying than a purely document-based approach for the core system entities.

For validation and robustness, Zod was chosen for schema-based request validation. This improves reliability by checking API payloads at the boundary and reducing the chance of malformed data entering the application. Security middleware such as Helmet, express-rate-limit, bcrypt, and express-session supports more professional backend practice than an ad hoc implementation would.

For AI integration, the main options were to avoid AI entirely, implement rule-based recommendation, or use an external generative model API. Google Gemini was selected because it supports structured JSON output, which is particularly useful for downstream UI rendering. The implementation constrains responses through response schemas, making the AI output easier to parse and safer to consume than free-form text alone. This is a pragmatic approach because it balances innovation with implementation speed.

### 2.3 Summary Tables

Table 1 summarises the benefits and limitations of the literature reviewed.

| Literature theme | Benefits for this project | Limitations or risks |
| --- | --- | --- |
| Travel recommender systems | Reduces information overload and supports personalised discovery | Recommendations may be biased, inaccurate, or too generic |
| Usability and HCI principles | Improves navigation, clarity, and user control across complex tasks | Requires actual user testing to validate effectiveness |
| Admin dashboard and management systems | Supports operational oversight, filtering, moderation, and maintenance | Can become complex if too many actions are exposed without prioritisation |
| Trustworthy AI literature | Encourages transparency, bounded use of AI, and human oversight | Still difficult to fully guarantee factual accuracy of generated travel content |
| Web security literature | Provides sound guidance for sessions, hashing, validation, and access control | Secure implementation requires continuous testing and operational discipline |

Table 2 summarises the benefits and limitations of the technologies reviewed.

| Technology option | Benefits | Limitations |
| --- | --- | --- |
| React with TypeScript | Component reuse, strong typing, mature ecosystem, suitable for complex UI flows | Can become state-heavy without careful structure |
| Vite | Fast development cycle and straightforward tooling | Smaller convention layer than full frameworks, so more design decisions are manual |
| Express with TypeScript | Full control over APIs, middleware, auth, and repository structure | Requires more manual setup than opinionated frameworks |
| MySQL-style relational persistence | Strong fit for structured travel data and admin queries | Requires schema design, migrations, and operational setup |
| Firebase or local fallback | Useful for rapid prototyping and resilience in demo contexts | Hybrid persistence can add architectural complexity |
| Zod | Strong runtime validation and improved API safety | Adds schema maintenance overhead |
| Google Gemini | Enables structured recommendation and generated travel content | External dependency, possible hallucinations, quota limits |

The outcome of this review influenced the project in three direct ways. First, it supported a modular full-stack architecture instead of a simple static or frontend-only application. Second, it encouraged bounded AI integration rather than full automation of user decisions. Third, it highlighted the need for evaluation at both technical and user-experience levels. These findings shaped the methodology by prioritising component-based UI design, repository-driven backend logic, secure input validation, and explicit recognition of AI limitations.

## 3. Methodology

This project followed an applied software engineering methodology focused on iterative design, implementation, and testing. The aim was not to prove a novel algorithm mathematically, but to create a working digital artefact that addresses a realistic problem in travel planning. The methodology therefore combined design thinking, incremental development, practical validation, and lightweight project management.

### 3.1 Design

The design process began by identifying the major user roles and journeys in the system. The primary user role is the traveller, who needs to register, sign in, browse destinations, create itineraries, manage profile information, inspect bookings, and send support messages. The secondary role is the administrator, who needs to review and manage user-generated and operational data. This led to a role-separated routing structure and the design of pages such as Landing, Destinations, Hotel, Itinerary, Profile, Contact, and Admin Dashboard.

At the architectural level, the project adopted a client-server model. The frontend was responsible for interaction, presentation, and orchestration of service calls, while the backend handled authentication, validation, business logic, and persistence. A repository-oriented backend structure was used so that domain areas such as users, bookings, itineraries, destinations, blog posts, and contact messages were separated into dedicated modules. This improves maintainability and aligns with professional software engineering practice.

The design also considered the role of automated recommendation. Rather than making it the central controller of the system, it was positioned as an enhancement layer for recommendations and travel-related content. This design choice followed from the literature review, which suggested that such tools are best used to support rather than replace user judgement in high-consequence consumer scenarios.

### 3.2 Testing and Evaluation

Testing was planned at several levels. Input validation was handled at the API boundary using Zod schemas. Authentication and route protection were enforced in both frontend routing and backend middleware. Functional testing focused on core user flows such as registration, login, itinerary creation, admin access, contact submission, and destination management. Manual exploratory testing was also suitable for assessing UI behaviour, state transitions, and fallback paths.

For evaluation, the methodology combined technical verification with user-oriented review. Technical verification includes checking whether each objective was implemented and whether major flows behaved correctly. User-oriented evaluation should include at least a small representative usability exercise, such as think-aloud testing with intended users, task completion checks, or structured feedback forms. If such testing has already been conducted, the results should be inserted in Section 5. If not, this report should state that the current evaluation is primarily artefact-based and that future work should include formal user studies.

### 3.3 Project Management

The project was managed iteratively, with development organised around feature slices rather than a single waterfall build. The repository evidence suggests a sprint-style approach in which issues such as itinerary functionality, admin controls, activity management, image handling, and sync behaviour were addressed incrementally. This style of project management is appropriate for web application development because interface decisions, backend requirements, and data needs often evolve together.

Version control was used to track changes, and the project would also benefit from a task board or backlog tool to document priorities, progress, and completed work. Evidence of project management activity should be included in the appendices.

### 3.4 Technologies and Processes

The implementation process used React, TypeScript, Vite, Express, Node.js, SQL-backed persistence, schema validation, session management, and Google Gemini integration. Development involved iterative coding, local execution, debugging, and integration testing of both the frontend and backend services. Where suitable, the project used reusable services and typed interfaces to reduce duplication and make interactions across layers more consistent.

Overall, this methodology was chosen because it fits the practical goal of producing a usable software artefact under time constraints while still supporting critical analysis. It also aligns with the outcomes of the literature and technology review, which favoured modularity, secure design, and bounded use of AI.

## 4. Implementation

The implementation of Voyage Travel Planner can be understood across five main areas: frontend user experience, backend API design, data and persistence, authentication and access control, and recommendation-driven travel functionality.

### 4.1 Frontend Implementation

The frontend was developed in React with TypeScript and organised into pages, components, and library services. Routing was implemented to support public pages such as the landing page and blog content, protected user pages such as destinations, itinerary, hotel, and profile, and protected admin-only pages for dashboard management. This separation supports clearer role handling and reduces the risk of unauthorised access through the client interface.

The page structure reflects the intended end-to-end user journey. The landing page introduces destinations and categories. The destinations page allows the user to browse results and travel-related entities. The itinerary page supports trip creation, display of trip details, and management of activities and associated booking information. The profile page centralises personal data and user-specific history. The contact page provides a structured support form with fields such as topic, destination, travel dates, and message body. The admin contact page and overall dashboard give staff visibility over submitted support issues and other core platform entities.

A service layer abstracts communication between frontend components and backend endpoints. This is visible in the use of dedicated services for destinations, bookings, itineraries, users, and messages. Typed interfaces are used for data structures such as Destination, Itinerary, Booking, and UserProfile, helping maintain consistency across the application.

The frontend also includes practical resilience features. For example, some service functions fall back to local storage in demo or non-authenticated contexts. While this is not a substitute for production-grade persistence, it is a useful implementation strategy during development and demonstration because it allows core flows to continue functioning even when some infrastructure is unavailable.

### 4.2 Backend API and Business Logic

The backend was implemented with Express and TypeScript. Middleware is used to handle JSON parsing, cookies, cross-origin requests, security headers, rate limiting, and session management. The API design covers a broad set of domains: authentication, users, destinations, bookings, itineraries, contact messages, favourites, blog posts, and search-related features.

One notable implementation decision is the use of repository modules to isolate database-facing logic. Instead of embedding SQL or storage code directly into routes, the system uses repository files such as userRepository, bookingRepository, itineraryRepository, destinationRepository, and contactRepository. This separation improves readability, makes route handlers thinner, and creates a better basis for maintenance or later testing.

Validation is applied through Zod schemas before business logic is executed. This is a strong implementation choice because it reduces malformed input, improves error clarity, and protects downstream layers from invalid state. The backend also includes error handling for invalid credentials, duplicate accounts, and permission failures.

### 4.3 Authentication and Authorisation

Authentication is implemented using hashed passwords, session regeneration on login, protected session cookies, and role-aware middleware. The backend limits repeated authentication attempts using rate limiting, which helps mitigate brute-force attacks. On the frontend, protected route wrappers are used to restrict access to logged-in users, and additional checks ensure that admin-only pages are only available to authorised roles.

This is an important part of the project because the system is not a static information portal. It stores user data and exposes management functions. Therefore, the implementation had to treat identity, privilege separation, and session safety as core requirements rather than optional extras.

### 4.4 Data and Persistence

The repository includes a SQL schema and migration structure for application data. Core entities include users, destinations, places, itineraries, itinerary days, itinerary items, and bookings. The backend expands this further through repositories for additional functional areas such as messages and blogs. A relational approach is appropriate because many entities in the project have clear one-to-many or many-to-one relationships, and administrative reporting often depends on structured joins and filtered queries.

The project also shows traces of hybrid evolution, with Firebase-related code present in the frontend and local-storage fallback behaviour used in some services. This reflects a practical development process in which rapid prototyping and later backend consolidation can coexist. From an implementation perspective, this is useful for demonstration resilience, but from an architectural perspective it also highlights the importance of future consolidation to reduce complexity.

### 4.5 Recommendation and Travel Search Features

The recommendation layer is implemented through a Gemini service that requests structured JSON results for recommendations, property listings, hotels, restaurants, attractions, and related travel content. A retry mechanism is included to handle quota-related failures more gracefully. The use of schema-constrained responses is a particularly important implementation detail because it reduces parsing ambiguity and makes these results easier to render in the interface.

The project also includes flight and local search service integration on the backend, indicating that the system aims to complement recommendation features with more targeted search-driven functionality. This hybrid approach is stronger than relying on one recommendation method alone because it distinguishes between inspirational content and operational travel information.

### 4.6 Admin and Support Workflows

The administrative dashboard is a major implementation feature. It aggregates users, trips, bookings, destinations, and messages, and supports search, filtering, and update actions. This gives the artefact a more realistic platform dimension than a user-only student project would have. The contact workflow similarly demonstrates operational thinking: users can submit structured messages and administrators can review and manage them. In practice, this improves the completeness of the system because travel platforms depend not only on self-service flows but also on support pathways.

### 4.7 Difficult Problems and How They Were Addressed

One of the more difficult implementation issues in a project like this is maintaining consistency across multiple stateful domains such as trips, activities, bookings, and admin views. The codebase addresses this by using typed models, repository separation, and targeted update logic for nested itinerary structures. Another challenge is balancing rapid feature development with security. The use of validation, session management, hashing, and middleware indicates an effort to treat security as an integrated concern rather than an afterthought. A further challenge lies in using recommendation technology safely. The project handles this pragmatically by bounding responses through schemas and keeping this functionality away from core authentication and persistence responsibilities.

Overall, the implementation demonstrates a substantial full-stack artefact rather than a minimal prototype. The breadth of features is one of its strongest points, although that breadth also creates complexity that must be managed carefully in evaluation and future development.

## 5. Evaluation and Results

### 5.1 Results

The implemented system successfully delivers the main functional areas that were targeted at the design stage. Users can register and log in, browse destinations, manage itineraries, interact with profile-related features, and submit contact messages. Administrators can access a protected dashboard to review users, trips, bookings, destinations, and support messages. The platform also includes recommendation and travel content support features, backed by a typed frontend and a structured backend API.

From a technical perspective, the project achieved a meaningful integration of client-side routing, backend business logic, session-based authentication, validation, repository-based data access, and recommendation services. This satisfies the core aim of building a unified travel planning platform rather than a single isolated feature.

However, the quality of results must be judged not only by feature presence but also by reliability, usability, and appropriateness. At present, the repository provides strong evidence of implementation breadth, but the final report should also include concrete measured results where available. These may include task completion rates, usability feedback, response times, error rates, or user satisfaction scores. Insert those results here if you collected them during testing.

Suggested measured results to add if available:

1. Number of participants in usability testing.
2. Success rate for tasks such as registration, creating a trip, adding an activity, and sending a support message.
3. Average time to complete a core trip-planning workflow.
4. Number of defects discovered during testing and how many were resolved.
5. Observed accuracy and usefulness of the recommendation features.

### 5.2 Evaluation

The project has several clear strengths. First, it provides a broad and coherent travel platform rather than a narrow feature demonstration. Second, it uses a relatively professional technical stack, including TypeScript, structured validation, repository separation, authentication middleware, and admin controls. Third, it incorporates AI in a bounded and practical way by using structured outputs rather than unconstrained text. Fourth, it demonstrates awareness of real-world platform needs such as support workflows and role-based management.

The project also has limitations. The architecture appears to contain some hybrid persistence history between Firebase-related code, local-storage fallback, and SQL-backed backend services. While understandable during development, this can complicate reasoning about the single source of truth. The recommendation content may also appear convincing without always being fully reliable, so stronger disclosure and verification patterns would improve trustworthiness. In addition, although the system is feature-rich, that breadth increases UI and maintenance complexity, and the report should be careful not to mistake feature count for validated user value.

If a think-aloud usability evaluation was carried out, it should be discussed here. A suitable evaluation would involve representative users completing tasks such as finding a destination, creating an itinerary, viewing bookings, and contacting support while verbalising their thought process. If such evaluation has not yet been completed, the report should explicitly state that the current evaluation is primarily artefact-based and that future work should include formal usability testing. That is a more defensible position than inventing user evidence.

### 5.3 Related Work

Voyage Travel Planner can be compared conceptually with commercial travel platforms and itinerary planners that separate discovery, booking, and support into different services. Many mainstream travel systems are strong in search and transaction handling but weaker in unified personalised planning, especially when users want both inspiration and operational control in one place. Conversely, some AI-powered planning tools provide generated itineraries but lack administrative workflows, user account structure, or persistent trip management.

The distinctive aspect of this project is its attempt to bridge these areas. It combines destination exploration, personalised recommendations, itinerary management, administrative visibility, and user support within one educational artefact. Compared with related work, the project is unlikely to match the scale, dataset quality, or production maturity of established travel platforms. However, it demonstrates a more complete systems perspective than many small academic travel recommendation prototypes, which often focus on only one algorithmic or interface feature.

## 6. Conclusion

Voyage Travel Planner set out to address the fragmentation of digital travel planning by building a unified full-stack platform for destination discovery, itinerary creation, booking-related management, support communication, and administrative oversight. Based on the current implementation, the project achieved this goal to a substantial extent. The final artefact includes the major functional areas originally required, demonstrates a structured technical architecture, and incorporates recommendation support in a constrained and useful manner.

The aims and objectives were largely met. A modular user interface was implemented with React and TypeScript. A backend API was developed using Express and TypeScript. Structured data handling, validation, role-based access, and security-aware middleware were integrated. An admin dashboard and contact workflow were also created, making the system more representative of a real service platform. The recommendation component broadened the user experience by supporting destination discovery and travel-oriented content suggestions.

The most significant output of the project is therefore not a single algorithm, but a coherent software artefact demonstrating how multiple travel-planning concerns can be integrated into one system. The project also shows that recommendation technology can be useful in this domain when it is treated as a support mechanism rather than a source of unquestioned truth.

### 6.1 Reflection

This project provided substantial learning across software architecture, frontend and backend integration, data modelling, authentication, validation, and the responsible use of recommendation services. One of the clearest lessons is that building a realistic full-stack platform requires balancing scope with depth. It is relatively easy to keep adding features, but harder to ensure that each feature is robust, testable, and easy to maintain.

Another important learning point concerns architectural consistency. The coexistence of multiple persistence-related approaches illustrates how software projects can evolve organically during development. This is often necessary in practice, but it also creates technical debt that must be recognised honestly. In hindsight, earlier consolidation around a single persistence strategy may have reduced complexity.

The project goals were met well in terms of feature breadth and system integration. They were met less strongly in areas that depend on formal evaluation evidence, especially if usability testing and quantitative results have not yet been fully documented. If this report is being finalised after implementation, it is important to strengthen that evidence rather than overstate confidence.

### 6.2 Future Work

There are several clear directions for future development.

1. Consolidate persistence architecture so that the application has a clearer single source of truth across frontend and backend services.
2. Add formal usability testing with representative travellers and analyse the findings quantitatively.
3. Improve transparency around recommendation features and add stronger verification steps for operational data.
4. Extend accessibility work, including keyboard navigation review, semantic testing, and screen-reader-focused improvements.
5. Add richer analytics, notifications, and collaborative trip-planning features.
6. Integrate production-grade booking APIs if the system is to move beyond prototype or academic demonstration status.

## 7. References

Use IEEE style only. Replace the placeholders below with real sources you have personally read and verified.

1. [Insert verified IEEE reference on recommender systems in tourism]
2. [Insert verified IEEE reference on usability or HCI principles]
3. [Insert verified IEEE reference on web application security or session management]
4. [Insert verified IEEE reference on AI trustworthiness or generative AI limitations]
5. [Insert verified IEEE reference on full-stack web architecture or modern web engineering]

## 8. Appendices

Appendix A: Project proposal.

Appendix B: Evidence of project management activity, such as sprint board screenshots, GitHub issues, or task tracking records.

Appendix C: Instructions for running the system locally, including frontend and backend startup, environment variables, and database setup.

Appendix D: Screenshots of the main user flows, including login, destinations, itinerary management, profile, contact submission, and admin dashboard.

Appendix E: Testing evidence, including bug logs, task-based test notes, and any usability feedback forms.

Appendix F: Any relevant stakeholder communication, anonymised where necessary.