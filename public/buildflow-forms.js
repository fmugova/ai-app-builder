// buildflow-forms.js
// Host this file in your public/ directory and include it in your published site forms.
// Usage: <script src="/buildflow-forms.js"></script>

window.BuildFlowForms = {
  /**
   * Submits a form and dispatches a custom event on the form element on success.
   * @param {Object} params
   * @param {string} params.projectId
   * @param {Object} params.formData
   * @param {string} [params.endpoint]
   * @param {HTMLFormElement} [params.formEl] - Optional: the form element to dispatch the event on
   */
  submit: async function ({ projectId, formData, endpoint, formEl }) {
    try {
      const res = await fetch(endpoint || `/api/projects/${projectId}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      // Dispatch custom event on the form element if provided
      if (formEl && typeof formEl.dispatchEvent === 'function') {
        formEl.dispatchEvent(new CustomEvent('buildflow:submit:success', { detail: data }));
      }
      return { success: true, ...data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};

// Example usage in your HTML form:
// <form id="contact-form">...</form>
// <script>
//   document.getElementById('contact-form').onsubmit = async function(e) {
//     e.preventDefault();
//     const formData = {
//       name: this.name.value,
//       email: this.email.value,
//       message: this.message.value,
//       formType: 'contact',
//     };
//     const result = await window.BuildFlowForms.submit({
//       projectId: 'YOUR_PROJECT_ID',
//       formData,
//       formEl: this // Pass the form element for event dispatch
//     });
//     if (result.success) alert('Thank you!');
//     else alert('Error: ' + result.error);
//   }
//
//   // Example: Listen for successful form submission
//   document.getElementById('contact-form').addEventListener('buildflow:submit:success', (e) => {
//     console.log('Form submitted!', e.detail);
//     // Redirect to thank you page
//     window.location.href = '/thank-you';
//   });
// </script>
