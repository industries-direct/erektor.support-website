---
layout: default
title: Request Immediate Dispatch
permalink: /pages/request-dispatch/
---

# Request Immediate Dispatch

Need urgent assistance in the field? Submit a dispatch request for immediate leg replacement or critical equipment repair. Our team responds quickly to minimize equipment downtime.

## Emergency Dispatch Request Form

<form action="https://formspree.io/f/xyzabc456" method="POST" class="dispatch-form">
  
  <div class="urgency-alert">
    <strong>⚠️ Emergency Response:</strong> For critical situations requiring immediate assistance, also call our emergency hotline: <strong>1-800-ERS-HELP (1-800-377-4357)</strong>
  </div>

  <fieldset>
    <legend>Equipment Information</legend>
    
    <div class="form-group">
      <label for="equipment-id">Equipment ID/Serial Number *</label>
      <input type="text" id="equipment-id" name="equipment_id" required placeholder="e.g., ERS-2024-001">
    </div>

    <div class="form-group">
      <label for="equipment-model">Equipment Model *</label>
      <select id="equipment-model" name="equipment_model" required>
        <option value="">-- Select a Model --</option>
        <option value="erektor-x1">Erektor X1</option>
        <option value="erektor-x2">Erektor X2</option>
        <option value="erektor-pro">Erektor Pro</option>
        <option value="erektor-industrial">Erektor Industrial</option>
        <option value="other">Other</option>
      </select>
    </div>

    <div class="form-group">
      <label for="location">Current Location *</label>
      <input type="text" id="location" name="location" required placeholder="Street address, City, State, ZIP">
    </div>
  </fieldset>

  <fieldset>
    <legend>Incident Details</legend>

    <div class="form-group">
      <label for="issue-type">Type of Issue *</label>
      <select id="issue-type" name="issue_type" required>
        <option value="">-- Select Issue Type --</option>
        <option value="leg-failure">Leg Failure</option>
        <option value="leg-replacement">Leg Replacement</option>
        <option value="controller-malfunction">Controller Malfunction</option>
        <option value="critical-failure">Critical System Failure</option>
        <option value="other">Other Emergency</option>
      </select>
    </div>

    <div class="form-group">
      <label for="affected-legs">Affected Legs/Components *</label>
      <div class="checkbox-group">
        <label><input type="checkbox" name="affected_legs" value="leg1"> Leg 1</label>
        <label><input type="checkbox" name="affected_legs" value="leg2"> Leg 2</label>
        <label><input type="checkbox" name="affected_legs" value="leg3"> Leg 3</label>
        <label><input type="checkbox" name="affected_legs" value="leg4"> Leg 4</label>
        <label><input type="checkbox" name="affected_legs" value="controller"> Controller</label>
        <label><input type="checkbox" name="affected_legs" value="other"> Other Component</label>
      </div>
    </div>

    <div class="form-group">
      <label for="severity">Severity Level *</label>
      <select id="severity" name="severity" required>
        <option value="">-- Select Severity --</option>
        <option value="critical">Critical - Equipment Non-Operational</option>
        <option value="high">High - Major Functionality Loss</option>
        <option value="medium">Medium - Partial Loss of Function</option>
        <option value="low">Low - Minor Issue</option>
      </select>
    </div>

    <div class="form-group">
      <label for="description">Detailed Problem Description *</label>
      <textarea id="description" name="description" rows="6" required placeholder="Describe the problem in detail. Include any error messages, unusual sounds, or behaviors you've noticed..."></textarea>
    </div>

    <div class="form-group">
      <label for="operations-impact">Business Impact/Operations Status *</label>
      <select id="operations-impact" name="operations_impact" required>
        <option value="">-- Select Impact --</option>
        <option value="production-halted">Production Halted</option>
        <option value="severely-limited">Operations Severely Limited</option>
        <option value="moderately-limited">Operations Moderately Limited</option>
        <option value="minor-impact">Minor Impact</option>
      </select>
    </div>
  </fieldset>

  <fieldset>
    <legend>Dispatch Preferences</legend>

    <div class="form-group">
      <label for="earliest-availability">Earliest Time You Can Receive Dispatch *</label>
      <input type="datetime-local" id="earliest-availability" name="earliest_availability" required>
    </div>

    <div class="form-group">
      <label for="site-access">Site Access Instructions</label>
      <textarea id="site-access" name="site_access" rows="4" placeholder="Provide any special instructions for site access, security gates, contact persons on-site, etc."></textarea>
    </div>

    <div class="form-group">
      <label for="hazards">Safety Hazards/Considerations</label>
      <textarea id="hazards" name="hazards" rows="3" placeholder="Inform us of any safety hazards, electrical concerns, or special equipment needed..."></textarea>
    </div>
  </fieldset>

  <fieldset>
    <legend>Contact Information</legend>

    <div class="form-group">
      <label for="contact-name">Your Name *</label>
      <input type="text" id="contact-name" name="contact_name" required placeholder="Your full name">
    </div>

    <div class="form-group">
      <label for="contact-email">Email Address *</label>
      <input type="email" id="contact-email" name="contact_email" required placeholder="your.email@example.com">
    </div>

    <div class="form-group">
      <label for="contact-phone">Phone Number (Mobile Preferred) *</label>
      <input type="tel" id="contact-phone" name="contact_phone" required placeholder="(123) 456-7890">
    </div>

    <div class="form-group">
      <label for="alternate-contact">Alternate Contact Number</label>
      <input type="tel" id="alternate-contact" name="alternate_contact" placeholder="(123) 456-7891">
    </div>

    <div class="form-group">
      <label for="contact-company">Company/Organization</label>
      <input type="text" id="contact-company" name="contact_company" placeholder="Your company name">
    </div>

    <div class="form-group">
      <label for="supervisor-name">On-Site Supervisor/Manager Name</label>
      <input type="text" id="supervisor-name" name="supervisor_name" placeholder="Name of person coordinating the dispatch">
    </div>
  </fieldset>

  <div class="form-group form-actions">
    <button type="submit" class="btn btn-urgent">Submit Urgent Dispatch Request</button>
    <button type="reset" class="btn btn-secondary">Clear Form</button>
  </div>

  <p class="form-note">* Required fields</p>
  <p class="form-note">A dispatch coordinator will contact you immediately upon form submission to confirm arrival time and coordinate logistics.</p>

</form>

## Dispatch Response Times

Our team responds to dispatch requests based on severity level and location:

| Severity | Target Response | Details |
|----------|-----------------|---------|
| Critical | 30 minutes | Immediate dispatch, all available resources |
| High | 1-2 hours | Priority dispatch, nearby technician |
| Medium | 2-4 hours | Standard dispatch, scheduled arrival |
| Low | Next business day | Routine scheduling available |

*Response times are estimates and may vary based on location and technician availability.*

## What Happens Next

1. **Immediate Acknowledgment**: You'll receive email/phone confirmation that your request was received
2. **Coordinator Contact**: A dispatch coordinator will call you within the target response time
3. **Logistics Planning**: We'll confirm arrival time, crew size, and any special equipment needed
4. **Dispatch Arrival**: Our team will arrive with necessary parts and tools
5. **Field Repair**: Professional field repair or leg replacement performed
6. **Follow-up**: You'll receive documentation of work performed and maintenance recommendations

## Field Replacement Procedure

Our technicians are equipped to perform complete leg replacement in the field. The process typically takes:

- **Single Leg Replacement**: 45 minutes to 2 hours
- **Multiple Leg Replacement**: 2-4 hours
- **Additional Diagnostics**: May add 30-60 minutes

We carry standard leg assemblies and components for most models. Specialized or custom components may require advance notice.

---

**For non-emergency maintenance:** [Schedule a maintenance appointment →](./schedule-maintenance.html)

**Emergency Hotline**: 1-800-ERS-HELP (1-800-377-4357)
