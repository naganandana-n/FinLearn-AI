document.addEventListener('DOMContentLoaded', function() {
    // Navigation between sections
    const navLinks = document.querySelectorAll('.sidebar .nav-link');
    const contentSections = document.querySelectorAll('.content-section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Update active nav link
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding section
            const sectionId = this.id.replace('nav-', '') + '-section';
            contentSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === sectionId) {
                    section.classList.add('active');
                }
            });
        });
    });

    // Load PDF resources for sidebar and PDF summary section
    loadPdfResources();

    // Chat functionality
    setupChatFunctionality();
    
    // Quiz functionality
    setupQuizFunctionality();
    
    // Study plan functionality
    setupStudyPlanFunctionality();
    
    // PDF summary functionality
    setupPdfSummaryFunctionality();
});

// Helper function to format dates
function formatDate(date) {
    return new Date(date).toLocaleString();
}

// Helper function to sanitize and render markdown content
function renderMarkdown(text) {
    // Set options for marked to sanitize output
    marked.setOptions({
        sanitize: true
    });
    return marked.parse(text);
}

// Function to load PDF resources
function loadPdfResources() {
    fetch('/api/get_pdf_resources')
        .then(response => response.json())
        .then(data => {
            // Populate sidebar resources list
            const resourcesList = document.getElementById('pdf-resources-list');
            resourcesList.innerHTML = '';
            
            const resourcesUl = document.createElement('ul');
            resourcesUl.className = 'nav flex-column small';
            
            data.resources.forEach(resource => {
                const li = document.createElement('li');
                li.className = 'nav-item';
                li.innerHTML = `<a class="nav-link py-1" href="${resource.url}" target="_blank">${resource.title}</a>`;
                resourcesUl.appendChild(li);
            });
            
            resourcesList.appendChild(resourcesUl);
            
            // Populate PDF selector in PDF summary section
            const pdfSelector = document.getElementById('pdf-selector');
            pdfSelector.innerHTML = '';
            
            data.resources.forEach((resource, index) => {
                const button = document.createElement('button');
                button.className = 'list-group-item list-group-item-action pdf-item';
                button.setAttribute('data-index', index);
                button.textContent = resource.title;
                button.addEventListener('click', function() {
                    const pdfIndex = this.getAttribute('data-index');
                    generatePdfSummary(pdfIndex);
                    
                    // Update active state
                    document.querySelectorAll('.pdf-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    this.classList.add('active');
                });
                pdfSelector.appendChild(button);
            });
            
            // Populate topic checkboxes in study plan form
            populateTopicCheckboxes(data.resources);
        })
        .catch(error => {
            console.error('Error loading PDF resources:', error);
            document.getElementById('pdf-resources-list').innerHTML = '<div class="alert alert-danger p-2">Error loading resources</div>';
        });
}

// Function to populate topic checkboxes in study plan form
function populateTopicCheckboxes(resources) {
    const topicCheckboxes = document.getElementById('topic-checkboxes');
    
    // Add individual topic checkboxes
    resources.forEach((resource, index) => {
        // Extract topic name from title
        const topicName = resource.title.replace(' Guide', '').replace(' Basics', '').replace(' Fundamentals', '');
        
        const div = document.createElement('div');
        div.className = 'form-check';
        div.innerHTML = `
            <input class="form-check-input topic-checkbox" type="checkbox" value="${topicName}" id="topic-${index}" disabled>
            <label class="form-check-label" for="topic-${index}">
                ${topicName}
            </label>
        `;
        topicCheckboxes.appendChild(div);
    });
    
    // Handle "All Topics" checkbox behavior
    const allTopicsCheckbox = document.getElementById('all-topics');
    const topicCheckboxes2 = document.querySelectorAll('.topic-checkbox');
    
    allTopicsCheckbox.addEventListener('change', function() {
        topicCheckboxes2.forEach(checkbox => {
            checkbox.disabled = this.checked;
            if (!this.checked) {
                checkbox.checked = true;
            }
        });
    });
}

// Setup chat functionality
function setupChatFunctionality() {
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-chat');
    const chatMessages = document.getElementById('chat-messages');
    
    function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;
        
        // Add user message to chat
        addMessageToChat('user', message);
        chatInput.value = '';
        
        // Show typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'assistant-message typing-indicator';
        typingIndicator.innerHTML = '<span></span><span></span><span></span>';
        chatMessages.appendChild(typingIndicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Send query to backend
        fetch('/api/query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: message })
        })
        .then(response => response.json())
        .then(data => {
            // Remove typing indicator
            chatMessages.removeChild(typingIndicator);
            
            // Add assistant response
            addMessageToChat('assistant', data.response);
        })
        .catch(error => {
            console.error('Error querying assistant:', error);
            chatMessages.removeChild(typingIndicator);
            addMessageToChat('system', 'An error occurred while processing your request. Please try again.');
        });
    }
    
    // Add a message to the chat container
    function addMessageToChat(type, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `${type}-message`;
        
        // Render markdown if it's from the assistant
        if (type === 'assistant') {
            messageDiv.innerHTML = renderMarkdown(content);
            messageDiv.classList.add('markdown-content');
        } else {
            messageDiv.textContent = content;
        }
        
        // Add timestamp
        const timeSpan = document.createElement('div');
        timeSpan.className = 'message-time';
        timeSpan.textContent = new Date().toLocaleTimeString();
        messageDiv.appendChild(timeSpan);
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

// Quiz functionality
function setupQuizFunctionality() {
    const generateQuizForm = document.getElementById('generate-quiz-form');
    const quizGeneratorForm = document.getElementById('quiz-generator-form');
    const quizContainer = document.getElementById('quiz-container');
    const optionsContainer = document.getElementById('options-container');
    const questionText = document.getElementById('question-text');
    const feedbackContainer = document.getElementById('feedback-container');
    const feedbackText = document.getElementById('feedback-text');
    const nextButton = document.getElementById('next-question');
    const prevButton = document.getElementById('prev-question');
    const quizProgress = document.getElementById('quiz-progress');
    const quizScore = document.getElementById('quiz-score');
    const quizResults = document.getElementById('quiz-results');
    const questionContainer = document.getElementById('question-container');
    const finalScore = document.getElementById('final-score');
    const restartQuizButton = document.getElementById('restart-quiz');
    const newQuizButton = document.getElementById('new-quiz');
    const quizTitle = document.getElementById('quiz-title');
    
    let currentQuiz = null;
    let currentQuestionIndex = 0;
    let questionStates = []; // Track the state of each question (answered, selected option)
    let quizScoreValue = { correct: 0, total: 0 };
    
    // Handle quiz form submission
    generateQuizForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const topic = document.getElementById('quiz-topic').value.trim();
        const numQuestions = document.getElementById('quiz-num-questions').value;
        const difficulty = document.getElementById('quiz-difficulty').value;
        
        if (!topic) {
            alert('Please enter a topic for the quiz.');
            return;
        }
        
        // Show loading state
        quizGeneratorForm.innerHTML = `
            <div class="text-center p-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3">Generating your quiz, please wait...</p>
            </div>
        `;
        
        // Generate quiz
        fetch('/api/generate_quiz', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                topic: topic,
                numQuestions: parseInt(numQuestions),
                difficulty: difficulty
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Store quiz data
            currentQuiz = data;
            currentQuestionIndex = 0;
            questionStates = Array(data.questions.length).fill().map(() => ({
                answered: false,
                selectedOption: null,
                isCorrect: false
            }));
            quizScoreValue = { correct: 0, total: 0 };
            
            // Reset UI
            resetQuiz();
            
            // Show quiz container and hide form
            quizGeneratorForm.style.display = 'none';
            quizContainer.style.display = 'block';
            quizTitle.textContent = `Quiz: ${topic} (${difficulty})`;
            
            // Show first question
            showQuestion(0);
        })
        .catch(error => {
            console.error('Error generating quiz:', error);
            quizGeneratorForm.innerHTML = `
                <div class="alert alert-danger">
                    <p>Failed to generate quiz: ${error.message}</p>
                    <button class="btn btn-primary mt-3" id="retry-quiz">Try Again</button>
                </div>
            `;
            document.getElementById('retry-quiz').addEventListener('click', function() {
                window.location.reload();
            });
        });
    });
    
    // Show a specific question
    function showQuestion(index) {
        const question = currentQuiz.questions[index];
        questionText.textContent = question.question;
        
        // Update progress indicator
        quizProgress.textContent = `Question ${index + 1}/${currentQuiz.questions.length}`;
        quizScore.textContent = `Score: ${quizScoreValue.correct}/${quizScoreValue.total}`;
        
        // Clear options
        optionsContainer.innerHTML = '';
        
        // Add options
        question.options.forEach((option, optionIndex) => {
            const button = document.createElement('button');
            button.className = 'option-btn';
            button.textContent = option;
            button.setAttribute('data-option-index', optionIndex);
            
            // If this question was already answered, show the state
            if (questionStates[index].answered) {
                if (option === question.correct_answer) {
                    button.classList.add('correct');
                } else if (option === questionStates[index].selectedOption) {
                    button.classList.add('incorrect');
                }
                button.disabled = true;
            } else if (questionStates[index].selectedOption === option) {
                // If option was selected but not submitted
                button.classList.add('selected');
            }
            
            button.addEventListener('click', function() {
                // Only allow selection if not already answered
                if (!questionStates[index].answered) {
                    // Clear previous selection
                    document.querySelectorAll('.option-btn').forEach(btn => {
                        btn.classList.remove('selected');
                    });
                    
                    // Mark this option as selected
                    this.classList.add('selected');
                    questionStates[index].selectedOption = option;
                    
                    // Enable next button since an option is selected
                    nextButton.disabled = false;
                }
            });
            
            optionsContainer.appendChild(button);
        });
        
        // Hide feedback if showing a new question
        feedbackContainer.style.display = 'none';
        
        // Show feedback if question was already answered
        if (questionStates[index].answered) {
            feedbackContainer.style.display = 'block';
            if (questionStates[index].isCorrect) {
                feedbackText.className = 'alert alert-success';
                feedbackText.innerHTML = `<strong>Correct!</strong> ${question.explanation}`;
            } else {
                feedbackText.className = 'alert alert-danger';
                feedbackText.innerHTML = `<strong>Incorrect.</strong> The correct answer is: ${question.correct_answer}.<br>${question.explanation}`;
            }
            
            // Change next button text on last question
            if (index === currentQuiz.questions.length - 1) {
                nextButton.innerHTML = 'Finish Quiz <i class="bi bi-flag"></i>';
            } else {
                nextButton.innerHTML = 'Next <i class="bi bi-arrow-right"></i>';
            }
            
            nextButton.disabled = false;
        } else {
            nextButton.disabled = true;
        }
        
        // Update navigation buttons
        prevButton.disabled = index === 0;
        
        // If all questions are answered, enable the next button to finish
        if (quizScoreValue.total === currentQuiz.questions.length && index === currentQuiz.questions.length - 1) {
            nextButton.disabled = false;
        }
        
        currentQuestionIndex = index;
    }
    
    // Check the current answer
    function checkAnswer() {
        const index = currentQuestionIndex;
        const question = currentQuiz.questions[index];
        const selectedOption = questionStates[index].selectedOption;
        
        if (!selectedOption) return;
        
        // Mark this question as answered
        questionStates[index].answered = true;
        
        // Check if correct
        const isCorrect = selectedOption === question.correct_answer;
        questionStates[index].isCorrect = isCorrect;
        
        // Update score
        quizScoreValue.total++;
        if (isCorrect) {
            quizScoreValue.correct++;
        }
        
        // Update UI
        document.querySelectorAll('.option-btn').forEach(btn => {
            const option = btn.textContent;
            if (option === question.correct_answer) {
                btn.classList.add('correct');
            } else if (option === selectedOption && !isCorrect) {
                btn.classList.add('incorrect');
            }
            btn.disabled = true;
        });
        
        // Show feedback
        feedbackContainer.style.display = 'block';
        if (isCorrect) {
            feedbackText.className = 'alert alert-success';
            feedbackText.innerHTML = `<strong>Correct!</strong> ${question.explanation}`;
        } else {
            feedbackText.className = 'alert alert-danger';
            feedbackText.innerHTML = `<strong>Incorrect.</strong> The correct answer is: ${question.correct_answer}.<br>${question.explanation}`;
        }
        
        // Update quiz progress
        quizScore.textContent = `Score: ${quizScoreValue.correct}/${quizScoreValue.total}`;
        
        // Enable next button
        nextButton.disabled = false;
        
        // If last question, change next button text
        if (index === currentQuiz.questions.length - 1) {
            nextButton.innerHTML = 'Finish Quiz <i class="bi bi-flag"></i>';
        }
        
        // Submit to backend for tracking (optional)
        fetch('/api/check_answer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                questionId: index,
                userAnswer: selectedOption
            })
        })
        .catch(error => {
            console.error('Error submitting answer:', error);
        });
    }
    
    // Function to reset quiz UI
    function resetQuiz() {
        questionContainer.style.display = 'block';
        quizResults.style.display = 'none';
        feedbackContainer.style.display = 'none';
        nextButton.innerHTML = 'Next <i class="bi bi-arrow-right"></i>';
        prevButton.disabled = true;
        nextButton.disabled = true;
    }
    
    // Function to show quiz results
    function showQuizResults() {
        questionContainer.style.display = 'none';
        quizResults.style.display = 'block';
        finalScore.textContent = `${quizScoreValue.correct}/${currentQuiz.questions.length}`;
    }
    
    // Next button event
    nextButton.addEventListener('click', function() {
        if (!questionStates[currentQuestionIndex].answered) {
            // If not answered yet, check the answer
            checkAnswer();
        } else {
            // If answered, move to next question or show results
            if (currentQuestionIndex < currentQuiz.questions.length - 1) {
                showQuestion(currentQuestionIndex + 1);
            } else {
                // End of quiz
                showQuizResults();
            }
        }
    });
    
    // Previous button event
    prevButton.addEventListener('click', function() {
        if (currentQuestionIndex > 0) {
            showQuestion(currentQuestionIndex - 1);
        }
    });
    
    // Restart quiz button
    restartQuizButton.addEventListener('click', function() {
        // Reset states but keep the same quiz
        currentQuestionIndex = 0;
        questionStates = Array(currentQuiz.questions.length).fill().map(() => ({
            answered: false,
            selectedOption: null,
            isCorrect: false
        }));
        quizScoreValue = { correct: 0, total: 0 };
        
        resetQuiz();
        showQuestion(0);
        
        // Reset on server
        fetch('/api/reset_quiz', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }).catch(error => {
            console.error('Error resetting quiz:', error);
        });
    });
    
    // New quiz button
    newQuizButton.addEventListener('click', function() {
        quizContainer.style.display = 'none';
        generateQuizForm.reset();
        quizGeneratorForm.style.display = 'block';
        
        // Reset on server
        fetch('/api/reset_quiz', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }).catch(error => {
            console.error('Error resetting quiz:', error);
        });
    });
}

// Study plan functionality
function setupStudyPlanFunctionality() {
    const generateStudyPlanForm = document.getElementById('generate-study-plan-form');
    const studyPlanForm = document.getElementById('study-plan-form');
    const studyPlanContainer = document.getElementById('study-plan-container');
    const overallObjectivesList = document.getElementById('overall-objectives-list');
    const dailyPlans = document.getElementById('daily-plans');
    const backToPlanFormButton = document.getElementById('back-to-plan-form');
    const downloadStudyPlanButton = document.getElementById('download-study-plan');
    
    // Handle study plan form submission
    generateStudyPlanForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form values
        const days = document.getElementById('study-days').value;
        const hoursPerDay = document.getElementById('hours-per-day').value;
        
        // Get selected topics
        const allTopics = document.getElementById('all-topics').checked;
        let topics = [];
        
        if (!allTopics) {
            document.querySelectorAll('.topic-checkbox:checked').forEach(checkbox => {
                topics.push(checkbox.value);
            });
        }
        
        // Show loading state
        studyPlanForm.innerHTML = `
            <div class="text-center p-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3">Creating your personalized study plan, please wait...</p>
            </div>
        `;
        
        // Generate study plan
        fetch('/api/create_study_plan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                topics: topics,
                days: parseInt(days),
                hoursPerDay: parseFloat(hoursPerDay)
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Hide form, show plan
            studyPlanForm.style.display = 'none';
            studyPlanContainer.style.display = 'block';
            
            // Render plan
            renderStudyPlan(data);
        })
        .catch(error => {
            console.error('Error generating study plan:', error);
            studyPlanForm.innerHTML = `
                <div class="alert alert-danger">
                    <p>Failed to create study plan: ${error.message}</p>
                    <button class="btn btn-primary mt-3" id="retry-plan">Try Again</button>
                </div>
            `;
            document.getElementById('retry-plan').addEventListener('click', function() {
                window.location.reload();
            });
        });
    });
    
    // Render the study plan
    function renderStudyPlan(data) {
        // Render overall objectives
        overallObjectivesList.innerHTML = '';
        data.overall_objectives.forEach(objective => {
            const li = document.createElement('li');
            li.textContent = objective;
            overallObjectivesList.appendChild(li);
        });
        
        // Render daily plans
        dailyPlans.innerHTML = '';
        data.plan.forEach(day => {
            const dayCard = document.createElement('div');
            dayCard.className = 'day-card';
            
            dayCard.innerHTML = `
                <div class="card-header">
                    Day ${day.day}
                </div>
                <div class="card-body">
                    <h5>Topics:</h5>
                    <ul>
                        ${day.topics.map(topic => `<li>${topic}</li>`).join('')}
                    </ul>
                    
                    <h5>Activities:</h5>
                    <ul>
                        ${day.activities.map(activity => `<li>${activity}</li>`).join('')}
                    </ul>
                    
                    <h5>Learning Objectives:</h5>
                    <ul>
                        ${day.objectives.map(objective => `<li>${objective}</li>`).join('')}
                    </ul>
                    
                    <h5>Resources:</h5>
                    <ul>
                        ${day.resources.map(resource => `<li>${resource}</li>`).join('')}
                    </ul>
                </div>
            `;
            
            dailyPlans.appendChild(dayCard);
        });
    }
    
    // Back to form button
    backToPlanFormButton.addEventListener('click', function() {
        studyPlanContainer.style.display = 'none';
        generateStudyPlanForm.reset();
        studyPlanForm.innerHTML = ''; // Clear loading state
        window.location.reload(); // Reload to reset form
    });
    
    // Download study plan button
    downloadStudyPlanButton.addEventListener('click', function() {
        // Create a text version of the study plan
        let planText = "# Your Personalized Finance Study Plan\n\n";
        
        planText += "## Overall Objectives\n\n";
        document.querySelectorAll('#overall-objectives-list li').forEach(li => {
            planText += `- ${li.textContent}\n`;
        });
        planText += "\n";
        
        document.querySelectorAll('.day-card').forEach(dayCard => {
            const dayTitle = dayCard.querySelector('.card-header').textContent;
            planText += `## ${dayTitle}\n\n`;
            
            const sections = dayCard.querySelectorAll('h5');
            sections.forEach(section => {
                planText += `### ${section.textContent}\n\n`;
                const items = section.nextElementSibling.querySelectorAll('li');
                items.forEach(item => {
                    planText += `- ${item.textContent}\n`;
                });
                planText += "\n";
            });
        });
        
        // Create a blob and download link
        const blob = new Blob([planText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'finance_study_plan.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

