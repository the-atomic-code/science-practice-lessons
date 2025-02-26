/**
 * Lesson Engine - Core functionality for interactive lessons
 */

// State management for the current lesson
let lessonState = {
    lessonData: null,
    startTime: null,
    completionTime: null,
    timerInterval: null,
    currentQuestion: 1,
    selectedOptions: {},
    firstAttempts: {},
    questionCompleted: {}
};

/**
 * Initializes and loads a lesson
 * @param {string} lessonPath - Path to the lesson JSON file
 */
async function loadLesson(lessonPath) {
    try {
        // If lessonPath is just an ID rather than a full path, correct it
        if (!lessonPath.includes('/')) {
            const basePath = `${window.location.origin}${window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1)}`;
            lessonPath = `${basePath}content/${lessonPath}/lesson.json`;
        }

        console.log("Final fetch path:", lessonPath);
        
        // Fetch the lesson data
        const response = await fetch(lessonPath);
        if (!response.ok) {
            throw new Error(`Failed to load lesson: ${response.status}`);
        }
        
        const lessonData = await response.json();
        
        // Initialize lesson state
        lessonState.lessonData = lessonData;
        lessonState.startTime = new Date();
        
        // Set up state tracking for each question
        lessonData.questions.forEach(question => {
            const questionId = question.id;
            lessonState.selectedOptions[questionId] = null;
            lessonState.firstAttempts[questionId] = null;
            lessonState.questionCompleted[questionId] = false;
        });
        
        // Render the lesson
        renderLesson(lessonData);
        
        // Start the timer
        startTimer();
        
        // Initialize first question
        initializeQuestion();
        
        return lessonData;
        
    } catch (error) {
        console.error('Error loading lesson:', error);
        document.getElementById('lesson-container').innerHTML = `
            <div class="container">
                <div class="error-message">
                    <h2><i class="fas fa-exclamation-triangle"></i> Error Loading Lesson</h2>
                    <p>${error.message}</p>
                    <p><a href="index.html">Return to lesson list</a></p>
                </div>
            </div>
        `;
        throw error;
    }
}

/**
 * Renders the lesson structure
 * @param {Object} lessonData - The lesson data
 */
function renderLesson(lessonData) {
    const lessonContainer = document.getElementById('lesson-container');
    
    // Clear any existing content including the loading message
    lessonContainer.innerHTML = '';
    
    // Create the container structure
    const container = document.createElement('div');
    container.className = 'container';
    
    // Build HTML content
    container.innerHTML = `
        <div class="lesson-container">
            <div class="lesson-header">
                <h1 class="lesson-title">${lessonData.title}</h1>
                <div class="time-display">
                    <i class="fas fa-clock"></i>
                    <span id="timeDisplay">00:00</span>
                </div>
            </div>
            
            <div class="progress-section">
                <div class="progress-info">
                    <div class="progress-label">Progress</div>
                    <div class="progress-label" id="progressInfo">0 of ${lessonData.questions.length} questions completed</div>
                </div>
                <div class="progress-container">
                    <div class="progress-bar" id="progressBar"></div>
                </div>
            </div>
            
            <div class="accuracy-display">
                <i class="fas fa-bullseye accuracy-icon"></i>
                <div class="accuracy-details">
                    <div class="accuracy-heading">Accuracy</div>
                    <div class="accuracy-stats">
                        <span class="accuracy-percentage" id="accuracyDisplay">0%</span>
                        <span class="accuracy-correct" id="correctDisplay">(0 correct answers)</span>
                    </div>
                </div>
            </div>
            
            <div id="questions"></div>
            
            <div class="completion-message" id="completionMessage">
                <div class="completion-icon">
                    <i class="fas fa-trophy"></i>
                </div>
                <h2 class="completion-title">Congratulations!</h2>
                <p>You have successfully completed this lesson.</p>
            </div>
        </div>
    `;
    
    // Add the container to the page
    lessonContainer.appendChild(container);
    
    // Render each question
    const questionsContainer = document.getElementById('questions');
    lessonData.questions.forEach(question => {
        // Create question element
        const questionElement = document.createElement('div');
        questionElement.id = `question${question.id}`;
        questionElement.className = 'question-container';
        
        // Check if this is a visual question (has image and options have images)
        const isVisualQuestion = question.image && 
                                question.options.some(option => option.image) &&
                                (question.visualMode === true); // Add this flag in your JSON

        // Add visual mode class if applicable
        if (isVisualQuestion) {
            questionElement.classList.add('visual-question');
        }
        
        questionElement.style.display = 'none'; // Hide initially
        
        // Build question HTML with support for images
        let questionHTML = `
            <h2>
                <span class="question-number">${question.id}</span>
                <span class="question-text">${question.text}</span>
            </h2>
        `;
        
        // Add question image if present with improved handling
        if (question.image) {
            const imagePath = getImagePath(question.image, lessonData.id);
            questionHTML += `
                <div class="image-container" id="question-image-container-${question.id}">
                    <img src="${imagePath}" alt="Question ${question.id} image" class="question-image" 
                         id="question-image-${question.id}" 
                         onload="this.parentElement.classList.remove('loading')" 
                         onerror="handleImageError(this, 'question')">
                </div>
            `;
        }
        
        // Add options container
        questionHTML += `<div class="options-container">`;
        
        // Add each option
        question.options.forEach((option, index) => {
            // Determine if this is an image-heavy option
            const hasImage = option.image ? true : false;
            const optionClass = hasImage ? 'option image-option' : 'option';
            
            questionHTML += `
                <div class="${optionClass}" onclick="selectOption(${question.id}, ${index}, this)">
                    <div class="option-content">
                        <span class="option-text">${option.text}</span>`;
                        
            // Add option image if present with improved handling
            if (option.image) {
                const optionImagePath = getImagePath(option.image, lessonData.id);
                questionHTML += `
                    <div class="option-image-container" id="option-image-container-${question.id}-${index}">
                        <img src="${optionImagePath}" alt="Option ${index + 1}" class="option-image" 
                             id="option-image-${question.id}-${index}"
                             onload="this.parentElement.classList.remove('loading')" 
                             onerror="handleImageError(this, 'option')">
                    </div>
                `;
            }
            
            questionHTML += `
                    </div>
                </div>
                <div class="explanation" id="explanation-${question.id}-${index}">
                    <i class="fas fa-${option.isCorrect ? 'check-circle' : 'times-circle'}" style="color: var(--${option.isCorrect ? 'success' : 'danger'}); margin-right: 8px;"></i>
                    ${option.explanation}
                </div>
            `;
        });
        
        questionHTML += `</div>`;
        
        // Add feedback, fun fact, and buttons
        questionHTML += `
            <div class="feedback" id="feedback-${question.id}"></div>
            
            ${question.funFact ? `
            <div class="fun-fact" id="fun-fact-${question.id}">
                <div class="fun-fact-title">
                    <i class="fas fa-lightbulb"></i> Fun Fact
                </div>
                <p>${question.funFact}</p>
            </div>
            ` : ''}
            
            <div class="button-container">
                <button class="check-answer-btn" id="check-${question.id}" onclick="checkAnswer(${question.id})">
                    <i class="fas fa-check"></i> Check Answer
                </button>
                ${question.id < lessonData.questions.length ? `
                <button class="next-button" id="next-${question.id}" onclick="showNextQuestion(${question.id})" style="display: none;">
                    <i class="fas fa-arrow-right"></i> Next Question
                </button>
                ` : ''}
            </div>
        `;
        
        // Set the HTML content
        questionElement.innerHTML = questionHTML;
        
        // Add the question to the container
        questionsContainer.appendChild(questionElement);
        
        // Mark image containers as loading
        if (question.image) {
            const imageContainer = document.getElementById(`question-image-container-${question.id}`);
            if (imageContainer) {
                imageContainer.classList.add('loading');
            }
        }
        
        // Mark option image containers as loading
        question.options.forEach((option, index) => {
            if (option.image) {
                const optionImageContainer = document.getElementById(`option-image-container-${question.id}-${index}`);
                if (optionImageContainer) {
                    optionImageContainer.classList.add('loading');
                }
            }
        });
    });

}

/**
 * Handles image loading errors
 * @param {HTMLImageElement} img - The image element that failed to load
 * @param {string} type - The type of image ('question' or 'option')
 */
function handleImageError(img, type) {
    // Add error class to parent container
    img.parentElement.classList.remove('loading');
    img.parentElement.classList.add('error');
    
    // Set fallback image and class
    img.src = 'common/assets/images/image-placeholder.png';
    img.alt = 'Image could not be loaded';
    img.classList.add('broken-image');
    
    // Log the error
    console.warn(`Failed to load ${type} image:`, img.src);
}

/**
 * Gets the proper path for an image based on whether it's a relative path or full URL
 * @param {string} image - The image path or URL
 * @param {string} lessonId - The lesson ID for resolving relative paths
 * @returns {string} - The proper image path
 */
function getImagePath(image, lessonId) {
    // If it starts with http or https, it's a full URL
    if (image.startsWith('http://') || image.startsWith('https://')) {
        return image;
    }
    
    // Handle relative paths with or without leading slash
    if (image.startsWith('/')) {
        return image.substring(1); // Remove leading slash
    }
    
    // Otherwise, construct a relative path to the lesson's images folder
    return `content/${lessonId}/images/${image}`;
}

/**
 * Initializes the display of the first question
 */
function initializeQuestion() {
    // Show first question with animation
    const firstQuestion = document.getElementById(`question${lessonState.currentQuestion}`);
    if (!firstQuestion) return;
    
    firstQuestion.style.opacity = '0';
    firstQuestion.style.transform = 'translateY(20px)';
    firstQuestion.style.display = 'block';
    
    setTimeout(() => {
        firstQuestion.style.opacity = '1';
        firstQuestion.style.transform = 'translateY(0)';
        firstQuestion.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    }, 100);
    
    // Hide all fun facts initially
    document.querySelectorAll('.fun-fact').forEach(fact => {
        fact.style.display = 'none';
    });
    
    // Initialize progress bar
    updateProgressBar();
}

/**
 * Starts the timer for the lesson
 */
function startTimer() {
    // Initial update
    updateTimer();
    
    // Start interval timer
    lessonState.timerInterval = setInterval(updateTimer, 1000);
}

/**
 * Updates the timer display
 */
function updateTimer() {
    const currentTime = new Date();
    const elapsedSeconds = Math.floor((currentTime - lessonState.startTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    document.getElementById('timeDisplay').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Handles the selection of an option
 * @param {number} questionId - The question ID
 * @param {number} optionIndex - The selected option index
 * @param {HTMLElement} element - The selected option element
 */
function selectOption(questionId, optionIndex, element) {
    // Store the selected option
    lessonState.selectedOptions[questionId] = optionIndex;
    
    // Get all options for this question
    const options = element.parentElement.querySelectorAll('.option');
    
    // Clear previous selections
    options.forEach(opt => {
        opt.classList.remove('selected');
        opt.classList.remove('incorrect');
    });
    
    // Mark this option as selected
    element.classList.add('selected');
}

/**
 * Checks the selected answer
 * @param {number} questionId - The question ID
 */
function checkAnswer(questionId) {
    // If no option selected, do nothing
    if (lessonState.selectedOptions[questionId] === null) {
        return;
    }
    
    // Find the correct option for this question
    const question = lessonState.lessonData.questions.find(q => q.id === questionId);
    if (!question) return;
    
    // Find the index of the correct option
    const correctOptionIndex = question.options.findIndex(option => option.isCorrect);
    
    // Record first attempt if not yet recorded
    if (lessonState.firstAttempts[questionId] === null) {
        lessonState.firstAttempts[questionId] = lessonState.selectedOptions[questionId];
        // Update accuracy immediately after first attempt
        updateAccuracy();
    }
    
    // Get the selected option
    const optionIndex = lessonState.selectedOptions[questionId];
    const options = document.querySelectorAll(`#question${questionId} .option`);
    const selectedElement = options[optionIndex];
    
    // Determine if the answer is correct
    const isCorrect = optionIndex === correctOptionIndex;
    
    // Show corresponding explanation
    const explanationId = `explanation-${questionId}-${optionIndex}`;
    const explanation = document.getElementById(explanationId);
    
    // Hide all explanations for this question first
    const questionDiv = document.getElementById(`question${questionId}`);
    const allExplanations = questionDiv.querySelectorAll('.explanation');
    allExplanations.forEach(exp => exp.style.display = 'none');
    
    // Show this explanation with animation
    explanation.style.display = 'block';
    
    // Handle correct or incorrect answer
    if (isCorrect) {
        handleCorrectAnswer(questionId, selectedElement, options);
    } else {
        handleIncorrectAnswer(questionId, selectedElement);
    }
}

/**
 * Handles a correct answer
 * @param {number} questionId - The question ID
 * @param {HTMLElement} selectedElement - The selected option element
 * @param {NodeList} options - All option elements for this question
 */
function handleCorrectAnswer(questionId, selectedElement, options) {
    // Clear previous visual states
    options.forEach(opt => {
        opt.classList.remove('incorrect');
    });
    
    // Mark the correct option
    selectedElement.classList.add('selected');
    lessonState.questionCompleted[questionId] = true;
    
    // Show feedback
    const feedbackElement = document.getElementById(`feedback-${questionId}`);
    feedbackElement.style.display = 'block';
    feedbackElement.innerHTML = '<i class="fas fa-check-circle" style="margin-right: 8px;"></i> Correct! Well done!';
    feedbackElement.className = 'feedback correct-feedback';
    
    // Show fun fact only after correct answer
    const funFact = document.getElementById(`fun-fact-${questionId}`);
    funFact.style.display = 'block';
    
    // Show next button if not the last question
    if (questionId < lessonState.lessonData.questions.length) {
        document.getElementById(`next-${questionId}`).style.display = 'block';
    } else {
        // If this is the last question and it's correct, check for completion
        checkAllCompleted();
    }
    
    // Hide check button
    document.getElementById(`check-${questionId}`).style.display = 'none';
    
    // Update progress
    updateProgressBar();
}

/**
 * Handles an incorrect answer
 * @param {number} questionId - The question ID
 * @param {HTMLElement} selectedElement - The selected option element
 */
function handleIncorrectAnswer(questionId, selectedElement) {
    // Mark the selected option as incorrect
    selectedElement.classList.add('incorrect');
    
    // Show feedback for incorrect answer
    const feedbackElement = document.getElementById(`feedback-${questionId}`);
    feedbackElement.style.display = 'block';
    feedbackElement.innerHTML = '<i class="fas fa-times-circle" style="margin-right: 8px;"></i> Incorrect. Try another option.';
    feedbackElement.className = 'feedback incorrect-feedback';
    
    // Hide fun fact for incorrect answer
    const funFact = document.getElementById(`fun-fact-${questionId}`);
    funFact.style.display = 'none';
}

/**
 * Shows the next question
 * @param {number} currentQuestionId - The current question ID
 */
function showNextQuestion(currentQuestionId) {
    // Hide current question with animation
    const currentQuestionElement = document.getElementById(`question${currentQuestionId}`);
    currentQuestionElement.style.opacity = '0';
    currentQuestionElement.style.transform = 'translateX(-20px)';
    currentQuestionElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    
    setTimeout(() => {
        currentQuestionElement.style.display = 'none';
        
        // Show next question with animation
        const nextQuestionId = currentQuestionId + 1;
        const nextQuestionElement = document.getElementById(`question${nextQuestionId}`);
        nextQuestionElement.style.display = 'block';
        nextQuestionElement.style.opacity = '0';
        nextQuestionElement.style.transform = 'translateX(20px)';
        
        setTimeout(() => {
            nextQuestionElement.style.opacity = '1';
            nextQuestionElement.style.transform = 'translateX(0)';
            nextQuestionElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        }, 50);
    }, 300);
    
    // Update current question
    lessonState.currentQuestion = currentQuestionId + 1;
    
    // Update progress bar
    updateProgressBar();
}

/**
 * Updates the accuracy display
 * @returns {number} The calculated accuracy percentage
 */
function updateAccuracy() {
    // Count correct first attempts
    let correctFirstAttempts = 0;
    let totalAttempted = 0;
    
    for (const questionId in lessonState.firstAttempts) {
        if (lessonState.firstAttempts[questionId] !== null) {
            totalAttempted++;
            
            // Find the correct option for this question
            const question = lessonState.lessonData.questions.find(q => q.id === parseInt(questionId));
            if (question) {
                const correctOptionIndex = question.options.findIndex(option => option.isCorrect);
                
                if (lessonState.firstAttempts[questionId] === correctOptionIndex) {
                    correctFirstAttempts++;
                }
            }
        }
    }
    
    // Calculate accuracy
    const accuracy = totalAttempted > 0 ? (correctFirstAttempts / totalAttempted) * 100 : 0;
    
    // Update accuracy display with animation
    const accuracyDisplay = document.getElementById('accuracyDisplay');
    accuracyDisplay.textContent = `${Math.round(accuracy)}%`;
    
    // Update the correct count display
    const correctDisplay = document.getElementById('correctDisplay');
    correctDisplay.textContent = `(${correctFirstAttempts} correct ${correctFirstAttempts === 1 ? 'answer' : 'answers'})`;
    
    // Add a brief highlight effect
    accuracyDisplay.style.transition = 'none';
    accuracyDisplay.style.transform = 'scale(1.2)';
    accuracyDisplay.style.color = accuracy >= 70 ? 'var(--success)' : 'var(--primary)';
    
    setTimeout(() => {
        accuracyDisplay.style.transition = 'all 0.3s ease';
        accuracyDisplay.style.transform = 'scale(1)';
        accuracyDisplay.style.color = 'var(--primary)';
    }, 300);
    
    return accuracy;
}

/**
 * Updates the progress bar
 */
function updateProgressBar() {
    // Count completed questions
    let completedCount = 0;
    for (const questionId in lessonState.questionCompleted) {
        if (lessonState.questionCompleted[questionId]) {
            completedCount++;
        }
    }
    
    // Calculate progress percentage
    const totalQuestions = lessonState.lessonData.questions.length;
    const progressPercentage = (completedCount / totalQuestions) * 100;
    
    // Update progress bar with animation
    const progressBar = document.getElementById('progressBar');
    const progressInfo = document.getElementById('progressInfo');
    
    progressBar.style.width = `${progressPercentage}%`;
    progressInfo.textContent = `${completedCount} of ${totalQuestions} questions completed`;
    
    // Change color based on progress
    if (progressPercentage >= 66) {
        progressBar.style.background = 'linear-gradient(to right, var(--secondary), var(--success))';
    } else if (progressPercentage >= 33) {
        progressBar.style.background = 'linear-gradient(to right, var(--secondary), var(--primary))';
    }
}

/**
 * Checks if all questions are completed
 */
function checkAllCompleted() {
    // Check if all questions are completed
    const allCompleted = Object.values(lessonState.questionCompleted).every(completed => completed === true);
    
    if (allCompleted) {
        // Record completion time
        lessonState.completionTime = new Date();
        
        // Stop the timer
        clearInterval(lessonState.timerInterval);
        
        // Hide all questions with animation
        const questionsContainer = document.getElementById('questions');
        questionsContainer.style.opacity = '0';
        questionsContainer.style.transform = 'translateY(-20px)';
        questionsContainer.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        
        setTimeout(() => {
            questionsContainer.style.display = 'none';
            
            // Show completion message with animation
            const completionMessage = document.getElementById('completionMessage');
            completionMessage.style.display = 'block';
            
            // Create confetti effect
            createConfetti();
            
            // Send completion data to Google Form
            sendCompletionData();
        }, 500);
    }
}

/**
 * Creates confetti effect
 */
function createConfetti() {
    const container = document.querySelector('.lesson-container');
    const colors = ['#4361ee', '#4cc9f0', '#2ec4b6', '#ff9f1c', '#e71d36'];
    
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.width = (Math.random() * 8 + 5) + 'px';
        confetti.style.height = (Math.random() * 8 + 5) + 'px';
        
        container.appendChild(confetti);
        
        // Remove confetti after animation completes
        setTimeout(() => {
            confetti.remove();
        }, 5000);
    }
}

/**
 * Gets student ID from URL parameters
 * @returns {string} The student ID or 'unknown'
 */
function getStudentId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('StudentID') || 'unknown';
}

/**
 * Gets lesson ID from URL parameters or lesson data
 * @returns {string} The lesson ID
 */
function getLessonId() {
    // First try from URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlLessonId = urlParams.get('lessonId');
    
    if (urlLessonId) {
        return urlLessonId;
    }
    
    // Fallback to lesson data
    return lessonState.lessonData.id || 'unknown';
}

/**
 * Extracts lesson path from URL parameters
 * @returns {string} The lesson path
 */
function getLessonPath() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('lesson') || null;
}

// Make functions available in the global scope for event handlers
window.selectOption = selectOption;
window.checkAnswer = checkAnswer;
window.showNextQuestion = showNextQuestion;
window.handleImageError = handleImageError;

// Initialize lesson if path is in URL
document.addEventListener('DOMContentLoaded', () => {
    const lessonPath = getLessonPath();
    if (lessonPath) {
        loadLesson(lessonPath);
    }
});
