/**
 * Analytics - Handles sending completion data to Google Forms
 */

/**
 * Sends completion data to Google Form
 */
function sendCompletionData() {
    // Calculate final accuracy
    const accuracy = updateAccuracy();
    
    // Get student ID and lesson ID
    const studentId = getStudentId();
    const lessonId = getLessonId();
    
    // Format dates for form submission
    const startedOnFormatted = lessonState.startTime.toISOString();
    const completedOnFormatted = lessonState.completionTime.toISOString();
    
    // Google Form submission URL - replace with your actual form URL
    const googleFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSdo2WuC82_b2LDj2Upm9rCje0xbT7SVzCnJ5ghBQfUaTlZj0Q/formResponse';
    
    // Create invisible form
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = googleFormUrl;
    form.target = 'hidden-iframe';
    
    // Create form fields with the specific entry IDs
    // Note: Update these field IDs to match your Google Form
    const fields = [
        { name: 'entry.2090980253', value: studentId }, // StudentID
        { name: 'entry.822636852', value: lessonId }, // LessonID
        { name: 'entry.1175798823', value: startedOnFormatted }, // StartedOn
        { name: 'entry.1532357843', value: completedOnFormatted }, // CompletedOn
        { name: 'entry.1386671773', value: Math.round(accuracy) } // Accuracy
    ];
    
    // Add fields to form
    fields.forEach(field => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = field.name;
        input.value = field.value;
        form.appendChild(input);
    });
    
    // Create hidden iframe for submission
    const iframe = document.createElement('iframe');
    iframe.name = 'hidden-iframe';
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    // Append form to document, submit it, then remove it
    document.body.appendChild(form);
    form.submit();
    
    // Clean up after submission
    setTimeout(() => {
        document.body.removeChild(form);
        document.body.removeChild(iframe);
    }, 1000);
}
