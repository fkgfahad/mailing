const emailsContainer = document.getElementById('emails-view');
const messageContainer = document.getElementById('message');
const bodyTitle = document.getElementById('body-title');

const composeForm = document.getElementById('compose-form');
const recipientsInput = document.getElementById('compose-recipients');
const subjectInput = document.getElementById('compose-subject');
const bodyInput = document.getElementById('compose-body');

const me = document.getElementById('me').innerText;

// Use buttons to toggle between views
document.getElementById('inbox').onclick = () => load_mailbox('inbox');
document.getElementById('sent').onclick = () => load_mailbox('sent');
document.getElementById('archived').onclick = () => load_mailbox('archive');
document.getElementById('compose').onclick = () => {
  bodyTitle.innerText = 'New Email';
  showMessage(null);
  // Show compose view and hide other views
  emailsContainer.innerHTML = '';
  composeForm.style.display = 'block';

  // Clear out composition fields
  clearInputs();
};

composeForm.onsubmit = (_) => {
  _.preventDefault();
  const body = {
    recipients: recipientsInput.value,
    subject: subjectInput.value,
    body: bodyInput.value,
  };
  sendMail(body)
    .then((data) => {
      if (data.error) {
        showMessage(data.error);
      } else {
        clearInputs();
        load_mailbox('sent');
        showMessage(data.message, false);
      }
    })
    .catch(catchError);
};

// By default, load the inbox
load_mailbox('inbox');

function load_mailbox(mailbox) {
  showMessage(null);
  emailsContainer.innerHTML = '';
  // Show the mailbox and hide other views
  emailsContainer.style.display = 'block';
  composeForm.style.display = 'none';

  // Show the mailbox name
  bodyTitle.innerText = capitalize(mailbox);

  if (!['inbox', 'sent', 'archive'].includes(mailbox)) return;

  getMails(mailbox).then(placeMails).catch(catchError);
}
function loadSingleMail(id) {
  getMail(id)
    .then((data) => {
      placeMail(data);
      if (!data.read) {
        readMail(id).catch(catchError);
      }
    })
    .catch(catchError);
}
function onArchive(id, data) {
  archiveMail(id, data)
    .then(() => {
      load_mailbox('inbox');
    })
    .catch(catchError);
}
function onReply(sender, subject, timestamp, body) {
  bodyTitle.innerText = 'New Email';
  emailsContainer.innerHTML = '';
  composeForm.style.display = 'block';

  recipientsInput.value = sender;
  subjectInput.value = subject.substr(0, 3) === 'Re:' ? subject : `Re: ${subject}`;
  bodyInput.value = `${timestamp} ${sender} wrote: ${body.replaceAll('#newline', '\n')}`;
}

function capitalize(str) {
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
}
function clearInputs() {
  recipientsInput.value = '';
  subjectInput.value = '';
  bodyInput.value = '';
}
function showMessage(msg, err = true) {
  if (!msg) {
    messageContainer.innerText = '';
    messageContainer.className = '';
    messageContainer.style.display = 'none';
  } else {
    messageContainer.className = `text-center alert alert-${err ? 'danger' : 'success'}`;
    messageContainer.innerText = msg;
    messageContainer.style.display = 'block';
  }
}
function catchError(e) {
  console.log(e);
  throw e;
}

function placeMails(data = []) {
  emailsContainer.innerHTML = '';
  if (data.length === 0) {
    emailsContainer.innerHTML = '<div class="text-center">No data found.</div>';
    return;
  }
  const ul = document.createElement('ul');
  ul.className = 'list-group';
  for (const mail of data) {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    if (mail.read) {
      li.className += ' read';
    }
    li.onclick = () => loadSingleMail(mail.id);
    li.innerHTML = `
      <span>
        ${mail.sender === me ? mail.recipients.join(', ') : mail.sender}
      </span>
      <span>
        ${mail.subject}
      </span>
      <span class="badge badge-primary badge-pill">
        ${mail.timestamp}
      </span>
    `;
    ul.append(li);
  }
  emailsContainer.append(ul);
}
function placeMail(mail) {
  const archBtn =
    mail.sender === me
      ? ''
      : `
    <button class="btn btn-warning" onclick="onArchive(${mail.id}, ${!mail.archived})">
      ${mail.archived ? 'Unarchive' : 'Archive'}
    </button>
  `;
  emailsContainer.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <strong>${mail.subject}</strong>
        </div>
        <div>
          From: ${mail.sender}
        </div>
        <div>
          To: ${mail.recipients.join(', ')}
        </div>
        <div>
          <small>${mail.timestamp}</small>
        </div>
      </div>
      <div class="card-body">
        <p>
          ${mail.body}
        </p>
      </div>
      <div class="card-footer">
        <button
          class="btn btn-primary"
          onclick="onReply('${mail.sender}', '${mail.subject}', '${mail.timestamp}', '${mail.body.replace(/(?:\r\n|\r|\n)/g, '#newline')}')"
        >
          Reply
        </button>
        ${archBtn}
      </div>
    </div>
  `;
}

// APIs
async function getMails(mailbox) {
  const r = await fetch(`/emails/${mailbox}`);
  return await r.json();
}
async function getMail(id) {
  const r = await fetch(`/emails/${id}`);
  return await r.json();
}
async function sendMail(body) {
  const r = await fetch('/emails', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return await r.json();
}
function archiveMail(mailId, data) {
  return fetch(`/emails/${mailId}`, {
    method: 'PUT',
    body: JSON.stringify({
      archived: data,
    }),
  });
}
function readMail(mailId) {
  return fetch(`/emails/${mailId}`, {
    method: 'PUT',
    body: JSON.stringify({
      read: true,
    }),
  });
}
