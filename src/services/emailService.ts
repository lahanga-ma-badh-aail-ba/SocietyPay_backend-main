// import { sendEmail } from '../config/email';

// export const sendReceiptEmail = async (
//   email: string,
//   ownerName: string,
//   flatNumber: string,
//   month: string,
//   year: number,
//   amount: number,
//   pdfBuffer: Buffer
// ): Promise<void> => {
//   const subject = `Payment Receipt - ${month} ${year} - Flat ${flatNumber}`;
  
//   const html = `
//     <!DOCTYPE html>
//     <html>
//     <head>
//       <style>
//         body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
//         .container { max-width: 600px; margin: 0 auto; padding: 20px; }
//         .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
//         .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
//         .details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
//         .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
//         .detail-label { font-weight: bold; color: #6b7280; }
//         .detail-value { color: #111827; }
//         .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
//         .amount { font-size: 24px; font-weight: bold; color: #10b981; text-align: center; margin: 20px 0; }
//       </style>
//     </head>
//     <body>
//       <div class="container">
//         <div class="header">
//           <h1 style="margin: 0;">Payment Received</h1>
//           <p style="margin: 10px 0 0 0;">Thank you for your payment</p>
//         </div>
//         <div class="content">
//           <p>Dear ${ownerName},</p>
//           <p>We have successfully received your maintenance payment. Please find the details below:</p>
          
//           <div class="details">
//             <div class="detail-row">
//               <span class="detail-label">Flat Number:</span>
//               <span class="detail-value">${flatNumber}</span>
//             </div>
//             <div class="detail-row">
//               <span class="detail-label">Period:</span>
//               <span class="detail-value">${month} ${year}</span>
//             </div>
//             <div class="detail-row" style="border-bottom: none;">
//               <span class="detail-label">Amount Paid:</span>
//               <span class="detail-value">₹${amount.toFixed(2)}</span>
//             </div>
//           </div>

//           <div class="amount">₹${amount.toFixed(2)}</div>

//           <p>Your payment receipt is attached to this email as a PDF document.</p>
//           <p>If you have any questions or concerns, please don't hesitate to contact us.</p>
          
//           <div class="footer">
//             <p><strong>${process.env.APP_NAME || 'Apartment Maintenance System'}</strong></p>
//             <p>This is an automated email. Please do not reply to this message.</p>
//           </div>
//         </div>
//       </div>
//     </body>
//     </html>
//   `;

//   await sendEmail(email, subject, html, [
//     {
//       filename: `receipt-${flatNumber}-${month}-${year}.pdf`,
//       content: pdfBuffer,
//       contentType: 'application/pdf',
//     },
//   ]);
// };