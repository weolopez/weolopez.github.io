class ResumeComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.resumeData = null;
    }

    async connectedCallback() {
        await this.fetchResumeData();
        this.render();
    }

    async fetchResumeData() {
        try {
            const response = await fetch('/resume.json');
            this.resumeData = await response.json();
        } catch (error) {
            console.error('Error fetching resume data:', error);
            this.resumeData = {};
        }
    }

    render() {
        if (!this.resumeData) {
            this.shadowRoot.innerHTML = `<p>Loading resume...</p>`;
            return;
        }

        const { basics, expertise, skills, awards, patents, education } = this.resumeData;

        this.shadowRoot.innerHTML = /*html*/ `
         
	<style>
		:host {
			    display: flex
				flex-direction: row;
				flex-wrap: wrap;
				justify-content: space-between;
				align-content: stretch;
				align-items: flex-start;
				line-height: 1.3;
		}
		#main {
			height: 95vh;
			overflow: scroll;
		}

		#link1 {
			animation: 1s ease-out 0s 1 slideInFromLeft;
		}

		#link2 {
			animation: 1s ease-out 0s 1 slideInFromRight;
		}


		h1 {
			color: black;
			font-family: 'Georgia', Monaco, monospace;
			font-size: 42px;
			font-weight: bold;
			letter-spacing: 5px;
			margin: 5px;
		}

		header {
			border-bottom: 1px solid #999;
			color: rgb(119, 119, 119);
			font-size: 20px;
			font-weight: 400;
			line-height: 1.3;
			margin: 0 0 16px 0;
			padding: 24px 24px 16px 0;
			text-align: center;
			width: 100%;
		}


		h4 {
			margin: 10px 0 0 0;
		}

		main {
			width: 74%;
		}

		aside {
			margin-left: 10px;
			width: 22%;
		}

		.brief {
			text-decoration: underline;
		}

		.brief:hover+.hidden {
			color: rgb(119, 119, 119);
			visibility: visible;
			height: auto;
			margin-left: 5px;
			width: 100%;
			opacity: 1;
			transition: opacity 1s linear;
		}

		.hidden:hover {
			color: rgb(119, 119, 119);
			visibility: visible;
			height: auto;
			margin-left: 5px;
			opacity: 1;
			transition: opacity 1s linear;
		}


		.date {
			float: right;
		}

		.row {
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: space-between;
			align-content: stretch;
			align-items: flex-start;
			line-height: 1.3;
			
		}

		.role {
			font-size: 14px;
			font-weight: bold;
		}

		.date {
			font-style: italic;
		}

		.application {
			margin-top: 10px;
		}

		.awards .brief {
			display: list-item;
			margin-left: 10px;
		}

	</style>
	<!-- <link rel="stylesheet" href="/weolopez/style.css">

	<script src="/weolopez/resume.js"></script> -->
</head>

<div id="main" class="row">
	<header id="header">
		<h1 id="main_applicant_name" class="name">Mauricio Lopez</h1>
		<div id="main_applicant_titleDescription" class="titleDescription">
			Software Developer with a proven track record of working with clients on delivering
			solutions to challenging business problems. Consistently delivers innovative technology
			with diverse teams.
		</div>
	</header>

	<main>
		<section id="main_experience" class="experience">
			<h4>Recent Work Experience</h4>
			<div id="main_experience_0" class="0">
				<div id="main_experience_0_application" class="application">ATT.COM Digital UI </div>
				<div class="row">
					<div id="main_experience_5_role" class="role">PRINCIPAL-SYSTEM ENGINEER - AT&T</div>
					<div class="date">December 2024 - Present</div>
				</div>
				<div id="main_experience_0_description" class="description">Transitioned from an Application Architect
					role to spearhead the design and development of Ask Architect—an AI web application and Microsoft
					Teams chat bot serving as an Architect Assistant. This solution leverages AT&T’s advanced AI
					infrastructure to augment our Retrieval-Augmented Generation (RAG) systems with deep Application and
					Systems context. Responsibilities include end-to-end solution architecture, integration of AI
					models, optimization of data pipelines, and delivering an intuitive UI/UX that empowers architects
					and streamlines enterprise operations.
				</div>
			</div>
			<div id="main_experience_0" class="0">
				<div id="main_experience_0_application" class="application">ATT.COM Digital UI </div>
				<div class="row">
					<div id="main_experience_5_role" class="role">PRINCIPAL-SYSTEM ENGINEER - AT&T</div>
					<div class="date">March 2022 - December 2024</div>
				</div>
				<div id="main_experience_0_description" class="description">Application Architect for att.com UI
					applications including
					homepage, sales, ordering and order management.
				</div>
			</div>
			<div id="main_experience_0" class="0">
				<div id="main_experience_0_application" class="application">Frito-Lay Operation Support UI </div>
				<div class="row">
					<div id="main_experience_5_role" class="role">Solution Architect - Tech Mahindra</div>
					<div class="date">March 2021 - Present</div>
				</div>
				<div id="main_experience_0_description" class="description">Lead solution, architecture and delivery
					team
					delivering operations support tools for identification and resolution of system issues. This React
					based application
					in conjunction with a general query micro service enables a user to securly query any application
					database with
					configurable queries enabling realtime analysis of application data.
				</div>
			</div>
			<div id="main_experience_0" class="0">
				<div id="main_experience_0_application" class="application">Shared Application Partner Management
					Platform
				</div>
				<div class="row">
					<div id="main_experience_5_role" class="role">IBM HYBRID CLOUD ARCHITECT</div>
					<div class="date">September 2019 - March 2021</div>
				</div>
				<div class="row">
					<div id="main_experience_5_role" class="role">AT&T PRINCIPAL-SYSTEM ENGINEER</div>
					<div class="date">November 2015 - September 2019</div>
				</div>
				<div id="main_experience_0_description" class="description">Lead technical, system and security
					architecture for AT&amp;T Business Device Management Platform (DMP). AT&amp;T DMP provides customer
					self
					service for enrollment and management of devices. Web application built on Angular and micro
					services.
					Event based data synchronization between billing systems and device management platform. Integration
					between AT&T and partner
					OEMs including Apple, Google and Samsung. Supported multiple usecases including Software License
					Management, Mobile Device Management
					E-Firmware Over The Air (EFOTA) and OEM Device Enrollment Programs.
				</div>
			</div>
			<div id="main_experience_2" class="2">
				<div id="main_experience_2_application" class="application">AT&amp;T Engage</div>
				<div class="row">
					<div id="main_experience_5_role" class="role">PRINCIPAL-SYSTEM ENGINEER</div>
					<div class="date">November 2012 - November 2014</div>
				</div>
				<div id="main_experience_2_description" class="description">Lead design and development of AT&amp;T
					Engage. AT&T Engage provided personalized video and audio generation to enhance online support and
					sales.
				</div>
			</div>
			<div id="main_experience_3" class="3">
				<div id="main_experience_3_application" class="application">TDICE and T.Data</div>
				<div class="row">
					<div id="main_experience_5_role" class="role">SENIOR-TECHNICAL ARCHITECT</div>
					<div class="date">November 2013 - February 2016</div>
				</div>
				<div id="main_experience_3_description" class="description">Lead design and development of AT&amp;T
					TDICE. Developed content management for T.Data a predictive analytics personalized recommendation
					engine.
					Designed a distributed Micro Service interface exposing a synchronous interface from IBM Streams a
					unidirectional asynchronous interface.
				</div>
			</div>
		</section>

		<section id="main_experience" class="experience">
			<h4>Work Experience</h4>
			<div id="main_experience_4" class="4">
				<div id="main_experience_4_application" class="application">Digital Life Online Store Front</div>
				<div class="row">
					<div id="main_experience_5_role" class="role">SENIOR-TECHNICAL ARCHITECT</div>
					<div class="date">November 2011 - November 2013</div>
				</div>
				<div class="brief">Online Sales for AT&T Digital Life</div>
				<div class="hidden" id="main_experience_4_description" class="description">Designed and Developed new
					online Account
					Management, Marketing, Ordering and Support applications for AT&amp;T Digital Life. Created a
					unique
					ordering application integrated with Mobility, Credit, Fulfillment, Billing and Connect Tech
					Appointment Scheduling systems. Developed modern mobile first designed websites that enabled
					rapid
					development and design changes based on CQ5 CMS and custom frameworks integrated with RBMS.
				</div>
			</div>
			<div id="main_experience_5" class="5">
				<div id="main_experience_5_application" class="application">ConnecTech Store Front</div>
				<div class="row">
					<div id="main_experience_5_role" class="role">SENIOR-TECHNICAL ARCHITECT</div>
					<div class="date">March 2011 - November 2011</div>
				</div>
				<div class="brief">Online Sales for AT&T On-Site Technical Support Product</div>
				<div class="hidden" id="main_experience_5_description" class="description">Authored Joint Interface
					Agreement,metrics solution and implementation plan. Created configuration management process from
					development builds
					to deployments in all environments using tools such as Hudson, shell scripts and Weblogic Deployer
					APIs.
				</div>
			</div>
			<div id="main_experience_6" class="6">
				<div id="main_experience_6_application" class="application">att.net and Insider Portals</div>
				<div class="row">
					<div id="main_experience_5_role" class="role">SENIOR-TECHNICAL ARCHITECT</div>
					<div class="date">August 2010 - March 2011</div>
				</div>
				<div class="brief">BellSouth internal and external personalized web portals</div>
				<div class="hidden" id=" main_experience_6_description" class="description">
					Participated in portal technology evaluations.
					Evaluated WebSphere Portal, Liferay, Gateln and developed proof of concept for Oracle WebCenter.
					Supported application design teamâ€TMs delivery of att.net projects and implementation alternate
					delivery process for content creation. Updated Insider portal requirements to reflect current
					functionality.</div>
			</div>
			<div id="main_experience_7" class="7">
				<div id="main_experience_7_application" class="application">Broadband Ordering and Care</div>
				<div class="row">
					<div id="main_experience_5_role" class="role">Lead Ordering Architect</div>
					<div class="date">January 2007-August 2010</div>
				</div>
				<div class="brief">Lead Ordering Architect for SE DSL</div>
				<div class="hidden" id=" main_experience_7_description" class="description">
					Ordering Provide Architectural Direction and Recommendations Developed Application Roadmap and
					Rationalization Provide technical consultations General Oversight for SE DSL Corporate Compliance,
					Provide technical solution for critical defects, Lead the effort to improve DSL Order flow through,
					resulting in a 400% improvement in 1 year. Developed a JavaFX order monitoring application that
					supported DSL flow through improvements. Lead Solution Architect for Oracle CRM replacement with
					Sterling Multi-Channel Fulfillment (MCF). Lead Solution Architect for AT&amp;T SE broadband for the
					NAP project; which integrated BellSouth DSL with Member Profile System.
				</div>
			</div>
			<div id="main_experience_8" class="8">
				<div id="main_experience_8_application" class="application">BellSouth Technology Group (BTG) Customer
					Markets
				</div>
				<div class="row">
					<div id="main_experience_5_role" class="role">Lead Application Architect (Employee)</div>
					<div class="date">August 2005-January 2007</div>
				</div>
				<div class="row">
					<div id="main_experience_5_role" class="role">Senior Application Architect (Contract)</div>
					<div class="date">August 2004-August 2005</div>
				</div>
				<div class="brief">Lead BSS Ordering Architect</div>
				<div class="hidden" id=" main_experience_8_description" class="description">Designed, Developed changes
					to
					Yantra and Informatica applications for Post BBT change requests and defects. Architecture Lead for
					BellSouth
					Broadband Transformation (BBT) Integrated Order Management (IOM). Responsible for reviewing and
					providing feedback on all Accenture deliverables for the BellSouth Customer Contact Transformation
					(CCT) Project. Participated as the Customer Markets CIO representative in the BellSouth IT
					Architecture Councils, including Technical Architecture, Business Architecture, and Extensible
					Architecture</div>
			</div>
			<div id="main_experience_9" class="9">
				<div id="main_experience_9_application" class="application">Accenture Wholesale Customer Operations
					Tower
				</div>
				<div class="row">
					<div id="main_experience_5_role" class="role">Technical Architect</div>
					<div class="date">November 2002 - August 2004</div>
				</div>
				<div class="brief">Bellsouth Wholesale Architect</div>
				<div class="hidden" id=" main_experience_9_description" class="description">ICS WebPortal, Service Order
					Review Tool
					(SORT), LCSC Toolkit, EASY Participated in J2EE Special Interest Group meetings. Maintained
					communication with Architects across towers to ensure that new development initiatives are following
					existing and emerging standards at BellSouth. Trained new developers in understanding the design and
					architecture of the applications for which they are responsible. Mentored developers on BellSouth
					technologies and Architectures. Conducted walkthroughs and peer reviews of developer's design and
					code. Participated in PRI, Security and OAD reviews. Provided production support and weekly status
					updates.</div>
			</div>
			<div id="main_experience_10" class="10">
				<div id="main_experience_10_application" class="application">Accenture BIST Tower
				</div>
				<div class="row brief">
					<div id="main_experience_5_role" class="role">Senior Software Developer</div>
					<div class="date">January 2002 - October 2002</div>
				</div>
				<div class="hidden" id=" main_experience_10_description" class="description">Maintained the XMLGateway
					application.
					Designed and developed changes to support LQS changes. Analyzed error rates to reduce the frequency
					from 27% to less than 1%.∫ Designed and analyzed changes to Core Services for Rodeo 1.0 that allowed
					discounts for DSL and Dial based on bundled wireless, long distance and wireline packages. Supported
					production of Core Services.
				</div>
			</div>
			<div id="main_experience_11" class="11">
				<div id="main_experience_11_application" class="application">Accenture Customer Markets Tower</div>
				<div class="row brief">
					<div id="main_experience_5_role" class="role">Senior Software Developer</div>
					<div class="date">January 2001-Dec 2002</div>
				</div>
				<div class="hidden" id=" main_experience_11_description" class="description">Data Center Relocation:
					Created production
					architecture layout and design documents to facilitate the data center move from Tucker to the
					Atlanta Internet Center (AIC). Communicated with team members to help coordinate move details and
					process plan. eRepair 2.0: Performed development and configuration management of eRepair 2.0.
					Reorganized build scripts to ease the deployment. Programmed Simulator, eCID Plus and eRepair
					Monitor by reviewing code and refactoring existing code. Small Business Vendor Services (SBVS):
					Delivered analysis, design and development of a web application for BellSouth small business vendors
					to view customer service record (CSR) information using common business services (CBS) and
					administrators to audit user activities.</div>
			</div>
			<div id="main_experience_12" class="12">
				<div id="main_experience_12_application" class="application">BellSouth Technology Group</div>
				<div class="row brief">
					<div id="main_experience_5_role" class="role">Systems Software Engineer Specialist</div>
					<div class="date">October 2000 - Dec. 2001</div>
				</div>
				<div class="hidden" id=" main_experience_12_description" class="description">Developed Wholesale Long
					Distance (WSLD)
					ordering application based on eLite, an MVC framework. Created 2 design patternsto allow for the
					persistence of forms without the need for additional coding. Worked on analysis of Consumer Long
					Distance Ordering. Performed development on Small Business Long Distance and EMRS phase 2.
					Development was based on Rational Rose UML diagrams. Enhanced logging in the ordering server to
					allow for dynamic adjustment of logging levels. Applied for 5 patents for BellSouth 2 related to the
					work on WSLD. Completed 8 of Sunâ€TMs Java Learning Program courses. Courses included effective
					exception handling, advanced J2EE, JSP/XSLT, Servlets, Swing and Forte IDE. Presented 2
					lunch-and-learns relating to new developments in the Java platform, Java Web Start and Java New I/O.
					Member of SOA SIG.
				</div>
			</div>
			<div id="main_experience_13" class="13">
				<div id="main_experience_13_application" class="application">Bellsouth Telecommunications
				</div>
				<div class="row brief">
					<div id="main_experience_5_role" class="role">Application Developer/Analyst (Contract)</div>
					<div class="date">March 1996 - March 1997 </div>
					<div style="width: 300px;"></div>
					<div>March 1998 - October 2000</div>
				</div>
				<div class="hidden" id=" main_experience_13_description" class="description">Performed full lifecycle
					development and
					maintenance of Direct Order Entry (DOE) system used daily by BellSouth service representatives.
					Designed and developed a Java-based client/server error analysis application for DOE. Designed a
					system to emulate the existing system environment and port DOE to another platform. Wrote a
					presentation and a prototype (in Java) of the replacement system. Developed C++ and UNIX shell
					scripts to aid in application analysis.</div>
			</div>
			<div id="main_experience_14" class="14">
				<div id="main_experience_14_application" class="application">PDG Software, Inc.</div>
				<div class="row brief">
					<div id="main_experience_5_role" class="role">Application Developer Consultant</div>
					<div class="date">Fall of 1999</div>
				</div>
				<div class="hidden" id=" main_experience_14_description" class="description">Created a NetObjects Fusion
					plug-in written
					in Java for the PDGShopping Cart. The Java program allowed for website authors to drag-and-drop
					shopping cart components on to their web pages. The plug-in is being co-marketed by PDGSoft and
					NetObjects.</div>
			</div>
			<div class="15">
				<div id="main_experience_15_application" class="application">Software Builders International</div>
				<div class="row brief">
					<div id="main_experience_5_role" class="role">Application Developer Architect</div>
					<div class="date">March 1997 - March 1998</div>
				</div>
				<div class="hidden" id="main_experience_15_description" class="description">Developed a Java-based ZIP
					compression/decompression GUI. NetZIP for Java, certified by SUN Microsystems. Created a prototype
					Java multi-platform document viewer. Attended a Java Beans development course, hosted by SUN
					Microsystems.</div>
			</div>
		</section>
	</main>

	<aside>
		<section>
			<h4 id="main_applicant_email" class="email">weolopez@gmail.com</h4>
			<h4 id="main_applicant_phone" class="phone">(404) 664-4899</h4>
			<div>1615 Northlake Springs Ct</div>
			<div>Decatur GA 30033</div>
		</section>

		<div id="main_expertise" class="expertise">
			<h4>Expertise</h4>
			<div id="main_expertise_0" class="0">Agile Development</div>
			<div id="main_expertise_1" class="1">Cloud Architecture</div>
			<div id="main_expertise_2" class="2">Full Stack Development</div>
			<div id="main_expertise_3" class="3">Onshore / Offshore Delivery</div>
			<div id="main_expertise_4" class="4">System Design and Technical Architecture</div>
			<div id="main_expertise_5" class="5">Systems Integration</div>
			<div id="main_expertise_6" class="6">Security Architecture</div>
		</div>

		<div id="main_skills" class="skills">
			<h4>Skills</h4>
			<div id="main_skills_0" class="0">Python, Typescript, NodeJS, Azure, Java MicroServices, Apache Camel, Kafka,
				Docker,
				Kubernetes, Linux, bash scripting, SQL, MongoDB, NodeJS, Nginx, UML (HLD/DD), vi,
				requirements estimation</div>
		</div>

		<div id="main_patents" class="awards">
			<h4>Awards</h4>
			<div class="brief">President's Volunteer </div>
			<div class="hidden">Service Award - Bronze (2016) Citizenship and Sustainability (External Affairs) This
				Bronze-level President Volunteer Service Award badge is awarded for employees who have reported 100-249
				hours of volunteer service in 2016 on the AT&T Volunteerism website at https://att.volunteermatch.org.
				Awarded 4/6/17 View Badge Details and Levels </div>

			<div class="brief">PCIO Award - CIO Award</div>
			<div class="hidden">Information Technology In recognition for receiving the highest achievement in IT
				Awarded 8/1/13 </div>

			<div class="brief">First Place Hack-a-thon</div>
			<div class="hidden">
				Mobilithon Winner - Fall 2015 Overall winner in creating innovative mobile application.
				Mobile First Hack-a-thon - First Place Mobilithon Winner
			</div>

			<div class="brief">First Place Hack-a-thon</div>
			<div class="hidden">
				Mobile First Hack-a-thon - Spring 2017 Overall winner in creating innovative application.
				Mobile First Hack-a-thon - Innovation Award</div>

			<div class="brief">Innovation award</div>
			<div class="hidden">
				Awarded 8/11/14s
				Mobile First Hack-a-thon - Second Place Mobilithon Winner - Spring 2016
			</div>

			<div class="brief">2nd place winner</div>
			<div class="hidden">
				Awarded 4/19/17s
				Mobile First Hack-a-thon - Second Place Mobilithon Winner - Spring 2016
			</div>

			<div class="brief">3rd Place Winner</div>
			<div class="hidden">
				Voted the 3rd place winner in creating an innovative mobile application.
				Awarded 10/17/13 View Badge Details and Levels
			</div>

			<div class="brief">AT&T 2019 Hackathon</div>
			<div class="hidden">
				AT&T 2019 Hackathon and Software Symposium Participants and Attendees
				AT&T Technology Development
			</div>

			<div class="brief">AT&T 2018 Hackathon</div>
			<div class="hidden">
				AT&T 2018 Hackathon and Software Symposium Participant
				AT&T Technology Development
			</div>

			<div class="brief">Consistently Exceeds</div>
			<div class="hidden">
				Performance reviews consistently exceeds, please ask for documented reference.
			</div>
		</div>
		<div id="main_patents" class="patents">
			<h4>Patents</h4>
			<div id="main_patents_0" class="0">
				<div id="main_patents_0_number" class="number"><a target="_blank"
						href="https://patents.google.com/patent/US20190019322A1">US20190019322A1</a>: Structuralized
					creation and transmission of personalized audiovisual data
				</div>
			</div>
			<div id="main_patents_0" class="0">
				<div id="main_patents_0_number" class="number"><a target="_blank"
						href="https://patents.google.com/patent/US7877434">7,877,434</a>: Presenting forms
					and publishing form data</div>
			</div>
			<div id="main_patents_1" class="1">
				<div id="main_patents_1_number" class="number"><a target="_blank"
						href="https://patents.google.com/patent/US7870537">7,870,537</a>: Real-time applications
					modification</div>
			</div>
			<div id="main_patents_2" class="2">
				<div id="main_patents_2_number" class="number"><a target="_blank"
						href="https://patents.google.com/patent/US7469270">7,469,270</a>: Presenting
					forms and publishing form data</div>
			</div>
			<div id="main_patents_3" class="3">
				<div id="main_patents_3_number" class="number"><a target="_blank"
						href="https://patents.google.com/patent/US7296297">7,296,297</a>: Web-based
					applications to validate data with validation functions</div>
			</div>
			<div id="main_patents_4" class="4">
				<div id="main_patents_4_number" class="number"><a target="_blank"
						href="https://patents.google.com/patent/US7103876">7,103,876</a>: Analyzing executing
					computer applications in real-time</div>
			</div>
			<div id="main_patents_5" class="5">
				<div id="main_patents_5_number" class="number"><a target="_blank"
						href="https://patents.google.com/patent/US7017151">7,017,151</a>: Real-time applications
					modification</div>
			</div>
			<div id="main_patents_6" class="6">
				<div id="main_patents_6_number" class="number"><a target="_blank"
						href="https://patents.google.com/patent/US7000236">7,000,236</a>: Applications to manipulate
					data with
					manipulation functions</div>
			</div>
		</div>
		<div id="main_skills" class="skills">
			<h4>Education</h4>
			<div>Tulane University <span>'91-'95</span></div>
			<div>BS Computer Science</div>
		</div>
	</aside>
</div>
        `;
    }
}

customElements.define('resume-component', ResumeComponent);