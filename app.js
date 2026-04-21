(() => {
  const config = window.RSVP_CONFIG || {};
  const form = document.getElementById('rsvpForm');
  const formMessage = document.getElementById('formMessage');
  const submitButton = document.getElementById('submitButton');
  const statusBanner = document.getElementById('statusBanner');
  const eventTitle = document.getElementById('eventTitle');
  const eventMeta = document.getElementById('eventMeta');
  const waiverA = document.getElementById('waiverA');
  const waiverB = document.getElementById('waiverB');
  const coordinatorEmail = document.getElementById('coordinatorEmail');
  const registrationModeNotice = document.getElementById('registrationModeNotice');
  const registrationType = document.getElementById('registrationType');
  const registrationTypeHelp = document.getElementById('registrationTypeHelp');
  const studentParentSection = document.getElementById('studentParentSection');
  const generalPublicSection = document.getElementById('generalPublicSection');
  const generalPublicOption = registrationType ? registrationType.querySelector('option[value="general_public"]') : null;
  const contactEmailLabel = document.getElementById('contactEmailLabel');
  const organizationSchoolLabel = document.getElementById('organizationSchoolLabel');
  const contactEmail = document.getElementById('contactEmail');
  const contactEmailConfirm = document.getElementById('contactEmailConfirm');

  let allowGeneralPublic = false;
  const blockedDomains = Array.isArray(config.blockedEmailDomains)
    ? config.blockedEmailDomains.map((domain) => String(domain || '').trim().toLowerCase()).filter(Boolean)
    : ['newarkunified.org', 'fusdk12.net'];

  if (!form) {
    return;
  }

  if (!config.webAppUrl || config.webAppUrl.includes('PASTE_YOUR_DEPLOYED_APPS_SCRIPT_EXEC_URL_HERE')) {
    formMessage.textContent = 'Setup is incomplete: add your Apps Script /exec URL in config.js.';
    submitButton.disabled = true;
    statusBanner.textContent = 'Setup is incomplete.';
    return;
  }

  form.action = config.webAppUrl;

  registrationType.addEventListener('change', () => {
    updateRegistrationUi();
    formMessage.textContent = '';
  });

  form.addEventListener('submit', (event) => {
    formMessage.textContent = '';

    const selectedType = registrationType.value;
    const email = String(contactEmail.value || '').trim().toLowerCase();
    const emailConfirm = String(contactEmailConfirm.value || '').trim().toLowerCase();

    if (!selectedType) {
      event.preventDefault();
      formMessage.textContent = 'Please choose an RSVP type.';
      registrationType.focus();
      return;
    }

    if (selectedType === 'general_public' && !allowGeneralPublic) {
      event.preventDefault();
      formMessage.textContent = 'General-public RSVP is not open yet. Please check back later.';
      registrationType.focus();
      return;
    }

    if (email !== emailConfirm) {
      event.preventDefault();
      formMessage.textContent = 'Your email address and confirmation email address must match.';
      contactEmailConfirm.focus();
      return;
    }

    if (isBlockedEmail(email)) {
      event.preventDefault();
      formMessage.textContent = 'School email addresses are not allowed. Please use a personal email.';
      contactEmail.focus();
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Submitting…';
  });

  updateRegistrationUi();
  loadStatus();

  function updateRegistrationUi() {
    const selectedType = registrationType.value || 'student_parent_pair';
    const isStudentPair = selectedType === 'student_parent_pair';

    studentParentSection.hidden = !isStudentPair;
    generalPublicSection.hidden = isStudentPair;

    toggleGroup(studentParentSection, '[data-student-field]', isStudentPair);
    toggleGroup(generalPublicSection, '[data-public-field]', !isStudentPair);

    if (!allowGeneralPublic && generalPublicOption) {
      generalPublicOption.disabled = true;
      if (selectedType === 'general_public') {
        registrationType.value = 'student_parent_pair';
      }
    } else if (generalPublicOption) {
      generalPublicOption.disabled = false;
    }

    const actualSelectedType = registrationType.value || 'student_parent_pair';
    const actualStudentPair = actualSelectedType === 'student_parent_pair';

    studentParentSection.hidden = !actualStudentPair;
    generalPublicSection.hidden = actualStudentPair;
    toggleGroup(studentParentSection, '[data-student-field]', actualStudentPair);
    toggleGroup(generalPublicSection, '[data-public-field]', !actualStudentPair);

    if (actualStudentPair) {
      contactEmailLabel.firstChild.textContent = 'Parent / guardian email address *';
      organizationSchoolLabel.firstChild.textContent = 'Student school / organization';
      registrationTypeHelp.textContent = allowGeneralPublic
        ? 'Only one parent/guardian for one child.'
        : 'Only one parent/guardian for one child.';
    } else {
      contactEmailLabel.firstChild.textContent = 'Email address *';
      organizationSchoolLabel.firstChild.textContent = 'Organization / school';
      registrationTypeHelp.textContent = '';
    }
  }

  function toggleGroup(section, selector, enabled) {
    section.querySelectorAll(selector).forEach((field) => {
      const tagName = field.tagName.toLowerCase();
      const type = (field.getAttribute('type') || '').toLowerCase();
      field.disabled = !enabled;

      if (type === 'radio') {
        field.required = enabled;
        if (!enabled) {
          field.checked = false;
        }
        return;
      }

      if (tagName === 'input' || tagName === 'select' || tagName === 'textarea') {
        field.required = enabled;
        if (!enabled) {
          field.value = '';
        }
      }
    });
  }

  function loadStatus() {
    const callbackName = `__rsvpStatus_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    const script = document.createElement('script');
    const separator = config.webAppUrl.includes('?') ? '&' : '?';

    window[callbackName] = (payload) => {
      cleanup();
      if (!payload || payload.ok !== true) {
        showLoadError();
        return;
      }
      applyStatus(payload);
    };

    script.src = `${config.webAppUrl}${separator}action=status&prefix=${encodeURIComponent(callbackName)}`;
    script.async = true;
    script.onerror = () => {
      cleanup();
      showLoadError();
    };
    document.body.appendChild(script);

    function cleanup() {
      delete window[callbackName];
      script.remove();
    }
  }

  function applyStatus(payload) {
    document.title = payload.event_title ? `${payload.event_title} RSVP` : 'RSVP';
    eventTitle.textContent = payload.event_title || 'RSVP';

    const metaParts = [payload.event_date_display, payload.event_location].filter(Boolean);
    eventMeta.textContent = metaParts.length ? metaParts.join(' • ') : 'Volunteer event';

    if (payload.waiver_url_a) {
      waiverA.href = payload.waiver_url_a;
    }
    if (payload.waiver_url_b) {
      waiverB.href = payload.waiver_url_b;
    }
    if (payload.coordinator_email) {
      coordinatorEmail.href = `mailto:${payload.coordinator_email}`;
      coordinatorEmail.textContent = payload.coordinator_email;
    }

    allowGeneralPublic = Boolean(payload.allow_general_public);
    if (registrationModeNotice) {
      registrationModeNotice.textContent = payload.registration_mode_message || '';
      registrationModeNotice.className = allowGeneralPublic ? 'notice-box notice-ok' : 'notice-box notice-info';
    }

    const openSpots = Number(payload.open_guaranteed_spots || 0);
    const confirmedCount = Number(payload.confirmed_count || 0);
    const waitlistCount = Number(payload.waitlist_count || 0);
    const capacity = Number(payload.guaranteed_capacity || 0);

    const modeSuffix = allowGeneralPublic
      ? 'General-public RSVP is currently open.'
      : 'Student + parent pairs are being prioritized right now.';

    if (openSpots > 0) {
      statusBanner.className = 'status-banner ok';
      statusBanner.textContent = `${openSpots} attendee ${openSpots === 1 ? 'spot is' : 'spots are'} still available. ${confirmedCount} of ${capacity} attendee spots are filled. ${modeSuffix}`;
      updateRegistrationUi();
      return;
    }

    statusBanner.className = 'status-banner waitlist';
    statusBanner.textContent = `All guaranteed spots are currently full. New RSVPs will join the waitlist. Current waitlist size: ${waitlistCount} attendee ${waitlistCount === 1 ? 'spot' : 'spots'}. ${modeSuffix}`;
    updateRegistrationUi();
  }

  function showLoadError() {
    statusBanner.className = 'status-banner';
    statusBanner.textContent = 'RSVP to plant trees with Urban Forest Friends!';
    updateRegistrationUi();
  }

  function isBlockedEmail(email) {
    const domain = email.split('@')[1]?.toLowerCase();
    return blockedDomains.includes(domain);
  }
})();
