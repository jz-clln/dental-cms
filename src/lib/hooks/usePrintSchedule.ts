'use client';

import { createClient } from '@/lib/supabase/client';
import { Appointment } from '@/types';
import { formatTime, getPatientName, formatDate } from '@/lib/utils';

export function usePrintSchedule() {
  async function printSchedule(date?: string) {
    const supabase = createClient();
    const targetDate = date ?? new Date().toISOString().split('T')[0];

    // Fetch today's appointments with patient and dentist info
    const { data, error } = await supabase
      .from('appointments')
      .select('*, patient:patients(*), dentist:dentists(name)')
      .eq('appointment_date', targetDate)
      .order('appointment_time', { ascending: true });

    if (error || !data) {
      alert('Failed to load schedule. Please try again.');
      return;
    }

    // Get clinic info
    const { data: { user } } = await supabase.auth.getUser();
    let clinicName = 'Dental Clinic';
    if (user) {
      const { data: staffData } = await supabase
        .from('staff')
        .select('clinic_id')
        .eq('auth_user_id', user.id)
        .single();
      if (staffData) {
        const { data: clinicData } = await supabase
          .from('clinics')
          .select('name')
          .eq('id', staffData.clinic_id)
          .single();
        if (clinicData) clinicName = clinicData.name;
      }
    }

    const appointments = data as Appointment[];
    const dateLabel = formatDate(targetDate);
    const printedAt = new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });

    const STATUS_COLORS: Record<string, string> = {
      Scheduled:  '#dbeafe',
      Confirmed:  '#ccfbf1',
      Done:       '#dcfce7',
      'No-show':  '#fee2e2',
      Cancelled:  '#f1f5f9',
    };

    // Build printable HTML
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Daily Schedule — ${dateLabel}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 13px;
            color: #1e293b;
            background: white;
            padding: 32px;
          }
          .header {
            border-bottom: 2px solid #0f766e;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .clinic-name {
            font-size: 20px;
            font-weight: 700;
            color: #0f766e;
          }
          .schedule-title {
            font-size: 15px;
            font-weight: 600;
            color: #334155;
            margin-top: 4px;
          }
          .meta {
            font-size: 11px;
            color: #94a3b8;
            margin-top: 4px;
          }
          .summary {
            display: flex;
            gap: 24px;
            margin-bottom: 20px;
            padding: 12px 16px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          .summary-item { text-align: center; }
          .summary-number { font-size: 22px; font-weight: 700; color: #0f766e; }
          .summary-label { font-size: 10px; color: #94a3b8; margin-top: 2px; }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          thead tr {
            background: #0f766e;
            color: white;
          }
          thead th {
            padding: 10px 12px;
            text-align: left;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          tbody tr {
            border-bottom: 1px solid #f1f5f9;
          }
          tbody tr:hover { background: #f8fafc; }
          tbody td {
            padding: 11px 12px;
            vertical-align: middle;
          }
          .time-cell {
            font-weight: 700;
            color: #0f766e;
            white-space: nowrap;
            width: 80px;
          }
          .patient-name { font-weight: 600; color: #1e293b; }
          .patient-contact { font-size: 11px; color: #94a3b8; margin-top: 2px; }
          .status-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
          }
          .notes-cell { font-size: 11px; color: #64748b; font-style: italic; }
          .empty {
            text-align: center;
            padding: 48px;
            color: #94a3b8;
            font-size: 14px;
          }
          .footer {
            margin-top: 24px;
            padding-top: 12px;
            border-top: 1px solid #e2e8f0;
            font-size: 10px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
          }
          @media print {
            body { padding: 20px; }
            @page { margin: 16mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-name">${clinicName}</div>
          <div class="schedule-title">Daily Appointment Schedule</div>
          <div class="meta">${dateLabel} &nbsp;·&nbsp; Printed at ${printedAt}</div>
        </div>

        <div class="summary">
          <div class="summary-item">
            <div class="summary-number">${appointments.length}</div>
            <div class="summary-label">Total</div>
          </div>
          <div class="summary-item">
            <div class="summary-number">${appointments.filter(a => a.status === 'Confirmed').length}</div>
            <div class="summary-label">Confirmed</div>
          </div>
          <div class="summary-item">
            <div class="summary-number">${appointments.filter(a => a.status === 'Done').length}</div>
            <div class="summary-label">Done</div>
          </div>
          <div class="summary-item">
            <div class="summary-number">${appointments.filter(a => a.status === 'No-show').length}</div>
            <div class="summary-label">No-show</div>
          </div>
          <div class="summary-item">
            <div class="summary-number">${appointments.filter(a => a.status === 'Cancelled').length}</div>
            <div class="summary-label">Cancelled</div>
          </div>
        </div>

        ${appointments.length === 0
          ? `<div class="empty">No appointments scheduled for ${dateLabel}.</div>`
          : `<table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Patient</th>
                  <th>Treatment</th>
                  <th>Dentist</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${appointments.map(appt => `
                  <tr>
                    <td class="time-cell">${formatTime(appt.appointment_time)}</td>
                    <td>
                      <div class="patient-name">${getPatientName(appt.patient)}</div>
                      ${appt.patient?.contact_number
                        ? `<div class="patient-contact">${appt.patient.contact_number}</div>`
                        : ''}
                    </td>
                    <td>${appt.treatment_type}</td>
                    <td>${appt.dentist?.name ?? '—'}</td>
                    <td>
                      <span class="status-badge" style="background:${STATUS_COLORS[appt.status] ?? '#f1f5f9'}">
                        ${appt.status}
                      </span>
                    </td>
                    <td class="notes-cell">${appt.notes ?? ''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>`
        }

        <div class="footer">
          <span>${clinicName} — Confidential Patient Schedule</span>
          <span>Dental CMS · ${dateLabel}</span>
        </div>
      </body>
      </html>
    `;

    // Open print window
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      alert('Pop-up blocked. Please allow pop-ups for this site and try again.');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 500);
  }

  return { printSchedule };
}
