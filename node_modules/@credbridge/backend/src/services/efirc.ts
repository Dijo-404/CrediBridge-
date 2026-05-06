import { PDFDocument, StandardFonts } from 'pdf-lib';
import { EfircDocument, OfframpResult, PaymentSession, Vendor } from '../types';
import { PURPOSE_CODES } from './purpose-codes';

function formatDate(value: Date) {
	return value.toISOString().split('T')[0];
}

export async function generateEfirc(
	session: PaymentSession,
	vendor: Vendor,
	offramp: OfframpResult
): Promise<EfircDocument> {
	const doc = await PDFDocument.create();
	const page = doc.addPage([595, 842]);
	const font = await doc.embedFont(StandardFonts.Helvetica);

	page.drawText('FOREIGN INWARD REMITTANCE CERTIFICATE (e-FIRC)', {
		x: 40,
		y: 800,
		size: 12,
		font,
	});

	const purposeDescription =
		PURPOSE_CODES[
			session.regulatory_metadata.purpose_code as keyof typeof PURPOSE_CODES
		] ?? 'Unknown';

	const fields: Array<[string, string]> = [
		['FIRC Number', `FIRC-${session.id.slice(0, 8).toUpperCase()}`],
		['Date of Remittance', formatDate(new Date())],
		['Beneficiary Name', vendor.name],
		['GSTIN', vendor.gst_number],
		['Amount Received (USD)', `$${session.amount_usd.toFixed(2)}`],
		['Amount Credited (INR)', `INR ${offramp.inr_amount.toFixed(2)}`],
		['Purpose Code', session.regulatory_metadata.purpose_code],
		['Purpose Description', purposeDescription],
		['Solana Tx Signature', session.solana_tx_signature ?? 'pending'],
		['AD Bank Reference', offramp.bank_reference],
		['EDPMS Reference', offramp.edpms_reference],
	];

	fields.forEach(([label, value], index) => {
		page.drawText(`${label}: ${value}`, {
			x: 40,
			y: 760 - index * 30,
			size: 10,
			font,
		});
	});

	const pdfBytes = await doc.save();

	return {
		filename: `efirc-${session.id}.pdf`,
		base64: Buffer.from(pdfBytes).toString('base64'),
	};
}
