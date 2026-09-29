export interface ParsedSms {
  transactionReference: string;
  senderName: string;
  senderPhone: string;
  amount: number;
  network: string;
  transactionTime: string;
  newBalance: number;
}

export function parseSms(rawSms: string, matchWords?: string[]): Partial<ParsedSms> | null {
  const normalized = rawSms.trim();

  // If matchWords provided, ensure at least one word matches before trying heavy regex
  if (matchWords && matchWords.length > 0) {
    const hasMatch = matchWords.some(word => 
      normalized.toLowerCase().includes(word.toLowerCase())
    );
    if (!hasMatch) return null;
  }

  // Swahili Universal Payment Match (M-Pesa, Airtel Money, Yas, etc)
  // Match format: starts with 10-char reference, followed by Imethibitishwa / Confirmed, contains Tsh[Amount]
  const swahiliMatch = normalized.match(/^([A-Z0-9]{10}).*?Tsh\s*([\d,]+\.\d{2})/i);
  if (swahiliMatch) {
    return {
      transactionReference: swahiliMatch[1],
      amount: parseFloat(swahiliMatch[2].replace(/,/g, '')),
      senderName: 'Mobile Payment Transfer',
      network: 'Mobile Money Gateway',
      transactionTime: new Date().toISOString().substring(0, 10),
      newBalance: 0,
    };
  }

  // M-Pesa Patterns
  // Example: 5K786HG98F Confirmed. You have received Tsh50,000.00 from JOHN DOE 255754000000 on 19/9/2026 at 10:24 AM. New M-Pesa balance is Tsh150,000.00.
  const mpesaMatch = normalized.match(/^([A-Z0-9]+)\s+Confirmed\.\s+You\s+have\s+received\s+Tsh([\d,.]+)\s+from\s+([\w\s]+)\s+(\d+)\s+on\s+([\d/]+)\s+at\s+([\d:APM\s]+)\.\s+New\s+M-Pesa\s+balance\s+is\s+Tsh([\d,.]+)/i);
  if (mpesaMatch) {
    return {
      transactionReference: mpesaMatch[1],
      amount: parseFloat(mpesaMatch[2].replace(/,/g, '')),
      senderName: mpesaMatch[3].trim(),
      senderPhone: mpesaMatch[4],
      transactionTime: `${mpesaMatch[5]} ${mpesaMatch[6]}`,
      newBalance: parseFloat(mpesaMatch[7].replace(/,/g, '')),
      network: 'M-Pesa',
    };
  }

  // Tigo Pesa Patterns
  // Example: 5K786HG98F Imethibitishwa. Umepokea Tsh50,000 kutoka kwa JOHN DOE (255714000000) mnamo 19/09/2026 saa 10:24. Salio lako jipya la Tigo Pesa ni Tsh150,000.
  const tigoMatch = normalized.match(/^([A-Z0-9]+)\s+Imethibitishwa\.\s+Umepokea\s+Tsh([\d,.]+)\s+kutoka\s+kwa\s+([\w\s]+)\s+\((\d+)\)\s+mnamo\s+([\d/]+)\s+saa\s+([\d:]+)\.\s+Salio\s+lako\s+jipya\s+la\s+Tigo\s+Pesa\s+ni\s+Tsh([\d,.]+)/i);
  if (tigoMatch) {
    return {
      transactionReference: tigoMatch[1],
      amount: parseFloat(tigoMatch[2].replace(/,/g, '')),
      senderName: tigoMatch[3].trim(),
      senderPhone: tigoMatch[4],
      transactionTime: `${tigoMatch[5]} ${tigoMatch[6]}`,
      newBalance: parseFloat(tigoMatch[7].replace(/,/g, '')),
      network: 'Tigo Pesa',
    };
  }

  // Airtel Money Patterns
  // Example: Airtel Money: 5K786HG98F Confirmed. Tsh 50,000 received from JOHN DOE (255684000000) on 2026-09-19 10:24:00. Balance: 150,000 Tsh.
  const airtelMatch = normalized.match(/Airtel\s+Money:\s+([A-Z0-9]+)\s+Confirmed\.\s+Tsh\s+([\d,.]+)\s+received\s+from\s+([\w\s]+)\s+\((\d+)\)\s+on\s+([\d-]+\s+[\d:]+)\.\s+Balance:\s+([\d,.]+)\s+Tsh/i);
  if (airtelMatch) {
    return {
      transactionReference: airtelMatch[1],
      amount: parseFloat(airtelMatch[2].replace(/,/g, '')),
      senderName: airtelMatch[3].trim(),
      senderPhone: airtelMatch[4],
      transactionTime: airtelMatch[5],
      newBalance: parseFloat(airtelMatch[6].replace(/,/g, '')),
      network: 'Airtel Money',
    };
  }

  // HaloPesa Patterns
  // Example: HaloPesa: 5K786HG98F Umepokea Tsh 50,000 kutoka kwa JOHN DOE (255624000000) mnamo 19/09/2026 10:24. Salio lako ni Tsh 150,000.
  const haloMatch = normalized.match(/HaloPesa:\s+([A-Z0-9]+)\s+Umepokea\s+Tsh\s+([\d,.]+)\s+kutoka\s+kwa\s+([\w\s]+)\s+\((\d+)\)\s+mnamo\s+([\d/]+\s+[\d:]+)\.\s+Salio\s+lako\s+ni\s+Tsh\s+([\d,.]+)/i);
  if (haloMatch) {
    return {
      transactionReference: haloMatch[1],
      amount: parseFloat(haloMatch[2].replace(/,/g, '')),
      senderName: haloMatch[3].trim(),
      senderPhone: haloMatch[4],
      transactionTime: haloMatch[5],
      newBalance: parseFloat(haloMatch[6].replace(/,/g, '')),
      network: 'HaloPesa',
    };
  }

  // Generic fallback or Bank transfer (Simplified)
  // Example: CRDB Bank: 5K786HG98F Confirmed. You have received Tsh 50,000.00 from JOHN DOE on 19/09/2026.
  const genericMatch = normalized.match(/([A-Z0-9]+)\s+Confirmed\.\s+You\s+have\s+received\s+Tsh\s*([\d,.]+)\s+from\s+([\w\s]+)\s+on\s+([\d/]+)/i);
  if (genericMatch) {
    return {
      transactionReference: genericMatch[1],
      amount: parseFloat(genericMatch[2].replace(/,/g, '')),
      senderName: genericMatch[3].trim(),
      transactionTime: genericMatch[4],
      network: 'Bank Transfer',
    };
  }

  return null;
}
