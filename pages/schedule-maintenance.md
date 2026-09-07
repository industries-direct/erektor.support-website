---
layout: default
title: Schedule Maintenance
permalink: /pages/schedule-maintenance/
---

# Schedule Maintenance

Book a maintenance appointment for your erektor equipment. Our certified technicians will perform comprehensive inspections and maintenance to ensure optimal performance.

## Maintenance Appointment Form

<form action="https://formspree.io/f/xyzabc123" method="POST" class="maintenance-form">
  
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
      <label for="location">Installation Location *</label>
      <input type="text" id="location" name="location" required placeholder="e.g., 123 Main Street, City, State">
    </div>
  </fieldset>

  <fieldset>
    <legend>Maintenance Details</legend>

    <div class="form-group">
      <label for="maintenance-type">Type of Maintenance *</label>
      <select id="maintenance-type" name="maintenance_type" required>
        <option value="">-- Select Maintenance Type --</option>
        <option value="routine">Routine Service</option>
        <option value="preventive">Preventive Maintenance</option>
        <option value="inspection">Equipment Inspection</option>
        <option value="repair">Repair Service</option>
        <option value="annual">Annual Inspection</option>
      </select>
    </div>

    <div class="form-group">
      <label for="preferred-date">Preferred Maintenance Date *</label>
      <input type="date" id="preferred-date" name="preferred_date" required>
    </div>

    <div class="form-group">
      <label for="preferred-time">Preferred Time Window *</label>
      <select id="preferred-time" name="preferred_time" required>
        <option value="">-- Select Time --</option>
        <option value="early-morning">Early Morning (6 AM - 9 AM)</option>
        <option value="morning">Morning (9 AM - 12 PM)</option>
        <option value="afternoon">Afternoon (12 PM - 5 PM)</option>
        <option value="evening">Evening (5 PM - 8 PM)</option>
      </select>
    </div>

    <div class="form-group">
      <label for="description">Description of Issues or Concerns</label>
      <textarea id="description" name="description" rows="5" placeholder="Describe any issues, concerns, or specific areas you'd like our technicians to focus on..."></textarea>
    </div>
  </fieldset>

  <fieldset>
    <legend>Contact Information</legend>

    <div class="form-group">
      <label for="contact-name">Contact Name *</label>
      <input type="text" id="contact-name" name="contact_name" required placeholder="Your full name">
    </div>

    <div class="form-group">
      <label for="contact-email">Email Address *</label>
      <input type="email" id="contact-email" name="contact_email" required placeholder="your.email@example.com">
    </div>

    <div class="form-group">
      <label for="contact-phone">Phone Number *</label>
      <input type="tel" id="contact-phone" name="contact_phone" required placeholder="(123) 456-7890">
    </div>

    <div class="form-group">
      <label for="contact-company">Company/Organization</label>
      <input type="text" id="contact-company" name="contact_company" placeholder="Your company name">
    </div>
  </fieldset>

  <div class="form-group form-actions">
    <button type="submit" class="btn btn-primary">Schedule Maintenance</button>
    <button type="reset" class="btn btn-secondary">Clear Form</button>
  </div>

  <p class="form-note">* Required fields</p>

</form>

## What to Expect

1. **Form Submission**: Submit your maintenance request through this form
2. **Confirmation**: You'll receive an email confirmation within 24 hours
3. **Scheduling**: Our team will contact you to confirm the appointment details
4. **Pre-Maintenance**: We'll send preparation instructions before the service date
5. **Service**: Our certified technician will arrive and perform the requested maintenance
6. **Follow-up**: You'll receive a detailed report of all work performed

## Maintenance Types

### Routine Service
Regular maintenance to keep your equipment in good working condition. Recommended every 3-6 months depending on usage.

### Preventive Maintenance
Proactive servicing to identify and address potential issues before they become problems.

### Equipment Inspection
Comprehensive inspection of all systems and components.

### Repair Service
Professional repair for identified issues or malfunctions.

### Annual Inspection
Complete yearly assessment of your equipment's condition and performance.

## Pricing & Support

Pricing varies based on equipment model and maintenance type. A representative will provide you with a detailed quote after your request is received.

---

**Need emergency assistance?** [Request immediate dispatch →](./request-dispatch.html)
