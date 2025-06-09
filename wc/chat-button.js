import "/chat-component/chat-component.js";

class ChatButton extends HTMLElement {
  constructor() {
    super();
    // Attach an open Shadow DOM for encapsulation.
	this.attachShadow({ mode: "open" });

    this.render();
  }
  connectedCallback() {
    // await this.fetchResumeData();
	const showButton = this.shadowRoot.querySelector('#open-chat-btn')
	showButton.addEventListener('click', () => {
        this.showChat();
    });
  }
  render() {
    this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: inline-block;
                    font-family: Arial, sans-serif;
                }
                button {
                    background-color: #007bff;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                }
                button:hover {
                    background-color: #0056b3;
                }


		.hidden {
			height: 0;
			visibility: hidden;
			opacity: 0;
			transition: opacity 1s linear;
		}

		chat-component {
			position: fixed;
			width: 50vw;
			height: 50vh;
			right: -50vw;
			bottom: 20px;
			z-index: 1000;
			transition: right 0.5s ease-in-out;
		}

		chat-component.active {
			right: 20px;
			/* Adjust as needed when slid in */
		}

		/* Add CSS for the chat button */
		#open-chat-btn {
			position: fixed;
			right: 20px;
			bottom: 20px;
			z-index: 1001;
			background: #00A9E0;
			border: none;
			border-radius: 50%;
			width: 60px;
			height: 60px;
			align-items: center;
			justify-content: center;
			cursor: pointer;
			/* Initially hide button */
			display: none;
			opacity: 0;
			transition: opacity 2s ease-in-out;
		}

		/* This class will fade the button in */
		#open-chat-btn.visible {
			opacity: 1;
		}
            </style>
	<button id="open-chat-btn">
		<svg viewBox="0 0 24 24">
			<path fill="white"
				d="M12,3C17.5,3 22,6.58 22,11C22,15.42 17.5,19 12,19C10.76,19 9.57,18.82 8.47,18.5C5.55,21 2,21 2,21C4.33,18.67 4.7,17.1 4.75,16.5C3.05,15.07 2,13.13 2,11C2,6.58 6.5,3 12,3M17,12V10H15V12H17M13,12V10H11V12H13M9,12V10H7V12H9Z">
			</path>
		</svg>
	</button>
	<chat-component brand="Mauricio Lopez" primary-color="#00A9E0" accent-color="#FF7F32">
	</chat-component>
        `;

	// Show chat button when chat is closed
    document.addEventListener("SHOW_CHAT", () => {
		this.showChat();
    });

	document.addEventListener("CLOSE_CHAT", () => {
	  this.closeChat();
	});
    // showChat = () => {
    //   document.querySelector("chat-component").classList.add("active");
    //   var openChatBtn = document.getElementById("open-chat-btn");
    //   // Remove visible class and hide button once chat is open
    //   openChatBtn.classList.remove("visible");
    //   openChatBtn.style.display = "none";
    // };
  }

  closeChat() {
	this.shadowRoot.querySelector("chat-component").classList.remove("active");
	var openChatBtn = this.shadowRoot.getElementById("open-chat-btn");
    // Show button and trigger its fade in
    openChatBtn.style.display = "block";
    // Allow a slight delay so the element is rendered before the fade is applied
    setTimeout(() => {
      openChatBtn.classList.add("visible");
    }, 10);
  }

  // Call showChat() when the event occurs (e.g., a click or key event)
  showChat() {

	let openChatBtn = this.shadowRoot.getElementById("open-chat-btn");
	const cc = this.shadowRoot.querySelector("chat-component");
	  cc.classList.add("active");
      openChatBtn.classList.remove("visible");
      openChatBtn.style.display = "none";
  }

  // function closeChat() {
  // 	document.querySelector('chat-component').classList.remove('active');
  // 	var openChatBtn = document.getElementById('open-chat-btn');
  // 	// Show button and trigger its fade in
  // 	openChatBtn.style.display = 'block';
  // 	// Allow a slight delay so the element is rendered before the fade is applied
  // 	setTimeout(() => { openChatBtn.classList.add('visible'); }, 10);
  // }
}

customElements.define("chat-button", ChatButton);
