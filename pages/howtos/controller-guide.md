---
layout: default
title: Controller Operations & Setup Guide
permalink: /pages/howtos/controller-guide/
---

# Controller Operations & Setup Guide

This comprehensive guide covers the setup, operation, and troubleshooting of your Erektor controller system. Follow these step-by-step instructions to ensure optimal performance.

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Power-On Procedure](#power-on-procedure)
3. [Basic Operations](#basic-operations)
4. [Advanced Features](#advanced-features)
5. [Troubleshooting](#troubleshooting)
6. [Maintenance](#maintenance)

---

## Initial Setup

### Unboxing and Inspection

1. **Carefully remove the controller** from its protective packaging
2. **Inspect for shipping damage** - Check for cracks, bent connectors, or loose components
3. **Verify all components** are included:
   - Controller unit
   - Power cable and adapter
   - Communication cable (USB or network)
   - Quick start guide
   - Calibration certificate

### Physical Installation

1. **Select a mounting location** that is:
   - Level and stable
   - Protected from moisture and dust
   - Easily accessible for operation
   - Away from direct sunlight
   - At least 2 feet away from the equipment

2. **Mount the controller** using the included bracket and fasteners
3. **Connect the communication cable** to the equipment's main control port
4. **Connect the power adapter** to a grounded electrical outlet
5. **Ensure all connections are secure** - Gently tug each cable to verify

### Initial Power-Up

1. **Connect the power cable** but do NOT switch on yet
2. **Press and hold the reset button** for 3 seconds (located on the back panel)
3. **Watch the status lights** - You should see:
   - Power LED (green) illuminates
   - Status LED (yellow) blinks slowly
4. **Wait 30 seconds** for the controller to fully boot
5. **Status LED should turn green** when ready

---

## Power-On Procedure

### Daily Startup Sequence

1. **Power on the main equipment** first
2. **Wait 10 seconds** for the equipment to initialize
3. **Power on the controller**
4. **Wait for the "Ready" indicator** (green light + beep sound)
5. **Verify all system lights** are functioning normally

### System Status Indicators

| Light Color | Pattern | Meaning |
|-------------|---------|---------|
| Green | Solid | Normal Operation |
| Green | Blinking | Initializing |
| Yellow | Solid | Warning - Non-Critical Issue |
| Yellow | Blinking | Performing Diagnostic |
| Red | Solid | Error - Critical Issue |
| Red | Blinking | Shutdown in Progress |
| Off | — | No Power |

### Startup Checklist

- [ ] Main equipment powered and initialized
- [ ] Controller powered on
- [ ] Status light is green
- [ ] No error sounds or alarms
- [ ] Display screen is responsive
- [ ] All legs report "Ready" status

---

## Basic Operations

### Display Navigation

The controller features a 7-inch touchscreen display with intuitive navigation:

1. **Home Screen**: Shows real-time status of all legs and systems
2. **Status Panel**: Displays current operation mode and diagnostics
3. **Controls**: Access basic movement and positioning commands
4. **Settings**: Adjust preferences and configurations

### Moving the Equipment

#### Manual Movement

1. **Access Controls** from the home screen
2. **Select Movement Type**:
   - Up/Down
   - Forward/Backward
   - Left/Right
   - Rotate

3. **Press and hold the directional button** to move
4. **Release the button** to stop movement
5. **Monitor the leg status** during movement for any anomalies

#### Preset Positions

The controller includes preset positions for common configurations:

1. **Raise to Working Height**: Optimal height for standard operations
2. **Lower to Transport**: Compact position for moving equipment
3. **Level Ground**: Automatically adjusts for uneven terrain
4. **Stow Position**: Safety configuration for storage

To activate a preset:
1. **Tap "Presets"** on the home screen
2. **Select desired position**
3. **Confirm the action** - Equipment will move automatically
4. **Wait for completion** - Status will update when finished

### Reading Status Information

The status panel displays:

- **Leg Health**: Status of each of the four legs
- **System Temperature**: Operating temperature of hydraulics/electronics
- **Pressure Level**: Current hydraulic pressure
- **Tilt Angle**: Current pitch and roll angles
- **Power Status**: Battery or main power status
- **Network Connection**: Communication status with equipment

---

## Advanced Features

### Calibration

Calibration ensures accurate positioning and leg synchronization.

**When to calibrate:**
- After initial setup
- After replacing a leg
- If positioning becomes inaccurate
- Annually as preventive maintenance

**Calibration procedure:**
1. **Navigate to Settings** → **Maintenance** → **Calibration**
2. **Place equipment on level ground**
3. **Start the calibration wizard**
4. **Follow on-screen instructions** - Equipment will move through preset positions
5. **Process takes approximately 5-10 minutes**
6. **Confirmation message** indicates successful calibration

### Remote Operation

The controller supports wireless operation when network connectivity is available:

1. **Access Remote Settings** → **Network** → **Remote Operation**
2. **Enable wireless mode** and note the device ID
3. **Connect a remote device** (tablet/phone) to the controller
4. **Use the mobile app** for remote movement control
5. **Operation range**: Up to 500 feet with clear line of sight

**Safety Note**: Always maintain visual line of sight when operating remotely.

### Logging and Diagnostics

The controller maintains detailed operational logs:

1. **Navigate to Diagnostics**
2. **View Activity Log** - Last 100 operations with timestamps
3. **Export Data** - Save logs to USB for analysis
4. **Run Self-Test** - Automatic system diagnostics
5. **Review Error History** - All errors with timestamps and codes

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: Display Won't Turn On

**Diagnosis:**
- Check power connection and LED indicator
- Verify power outlet is functioning

**Solutions:**
1. Unplug power cable
2. Wait 10 seconds
3. Reconnect and wait 30 seconds for boot
4. If still unresponsive, press reset button on back panel
5. If problem persists, contact support

#### Issue: Leg Not Responding

**Diagnosis:**
- Check leg status in Status Panel
- Verify communication cable is secure

**Solutions:**
1. Restart the controller (power cycle)
2. Verify leg connection at equipment
3. Run system diagnostics
4. Check for error codes in error log
5. If specific leg fails, may require field replacement

#### Issue: Slow or Unresponsive Touch Screen

**Diagnosis:**
- Display may need calibration
- Software may need update

**Solutions:**
1. Calibrate the touchscreen: Settings → Display → Calibrate Touch
2. Restart the controller
3. Check for firmware updates: Settings → System → Firmware Update
4. If slowness persists, perform factory reset (back up data first)

#### Issue: Error Messages or Warning Lights

See the error code reference below, or contact support with the specific error code.

### Error Code Reference

| Code | Message | Severity | Action |
|------|---------|----------|--------|
| E001 | Leg Communication Lost | Critical | Check cable connections; restart controller |
| E002 | Pressure Sensor Failure | High | Schedule immediate maintenance dispatch |
| E003 | Temperature Overheat | Medium | Allow equipment to cool; check ventilation |
| E004 | Power Supply Fault | Critical | Check power connections and outlet |
| W001 | Calibration Drift Detected | Low | Recalibrate system |
| W002 | Firmware Update Available | Low | Download and install update when convenient |

---

## Maintenance

### Daily Maintenance

- **Inspect cable connections** for loose or damaged plugs
- **Clean the display** with a soft, dry cloth
- **Check status indicators** are functioning normally
- **Review operation log** for any anomalies

### Weekly Maintenance

- **Perform system self-test** via Diagnostics menu
- **Check for firmware updates**
- **Inspect controller housing** for debris or damage
- **Verify all buttons and controls** are responsive

### Monthly Maintenance

- **Calibrate the system** for accuracy
- **Export and review operation logs** for trends
- **Clean all ports and connectors** with compressed air
- **Test backup power** (if applicable)

### Annual Maintenance

- **Professional inspection** by certified technician
- **Complete system diagnostics**
- **Calibration recalibration**
- **Firmware and software updates**

---

## Getting Help

**For questions or issues:**
- Consult this guide first
- Check the error code reference
- Review the troubleshooting section
- [Schedule maintenance](../schedule-maintenance.html) for non-urgent issues
- [Request immediate dispatch](../request-dispatch.html) for critical problems
- Call emergency support: 1-800-ERS-HELP

---

**Last Updated**: 2026 | **Version**: 2.1 | [Back to How-To Guides →](../howtos/)
