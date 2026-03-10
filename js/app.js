// Initialize DisClone App
document.addEventListener("DOMContentLoaded", () => {
  const userId = "demo-user"; // Replace with Firebase Auth UID in real app
  Servers.init(userId);
  document.addEventListener("DOMContentLoaded", () => {
    // Show the main app container
    document.getElementById('app').style.display = 'flex';

    // Initialize servers with a demo ID or Firebase user ID
    Servers.init("demo-user");
});

  // Message send handler
  const msgForm = document.getElementById('message-form');
  msgForm.addEventListener('submit', e => {
    e.preventDefault();
    Messages.send(document.getElementById('message-input').value);
    document.getElementById('message-input').value = '';
  });

  // Modal close
  document.getElementById('modal-close').addEventListener('click', UI.closeModal);
});
