import { useState } from "react";

export function useBarcodeProcessor() {
  const [barcode, setBarcode] = useState("");
  const [barcodeError, setBarcodeError] = useState("");
  const [barcodeProcessing, setBarcodeProcessing] = useState(false);
  const [extractedDueDate, setExtractedDueDate] = useState(null);
  const [extractedValue, setExtractedValue] = useState(null);
  const [delayInfo, setDelayInfo] = useState({ delayed: false, days: 0 });

  const handleBarcodeInput = (e) => {
    const rawBarcode = e.target.value.replace(/\D/g, '');
    setBarcode(formatBarcode(rawBarcode));
  };

  const formatBarcode = (code) => {
    if (!code) return '';
    code = code.replace(/\D/g, '');
    let formattedCode = '';
    
    if (code.length <= 5) {
      formattedCode = code;
    } else if (code.length <= 10) {
      formattedCode = `${code.substring(0, 5)}.${code.substring(5)}`;
    } else if (code.length <= 15) {
      formattedCode = `${code.substring(0, 5)}.${code.substring(5, 10)} ${code.substring(10)}`;
    } else if (code.length <= 21) {
      formattedCode = `${code.substring(0, 5)}.${code.substring(5, 10)} ${code.substring(10, 15)}.${code.substring(15)}`;
    } else if (code.length <= 32) {
      formattedCode = `${code.substring(0, 5)}.${code.substring(5, 10)} ${code.substring(10, 15)}.${code.substring(15, 21)} ${code.substring(21, 32)}`;
    } else {
      formattedCode = `${code.substring(0, 5)}.${code.substring(5, 10)} ${code.substring(10, 15)}.${code.substring(15, 21)} ${code.substring(21, 32)} ${code.substring(32)}`;
    }
    
    return formattedCode;
  };

  const extractValueFromBarcode = (barcode) => {
    try {
      const raw = barcode.replace(/[^0-9]/g, '');
      
      if (raw.length < 44) return null;
      
      let barcodeNumber;
      if (raw.length === 47) {
        barcodeNumber = 
          raw.substring(0, 4) + 
          raw.substring(32, 47) + 
          raw.substring(4, 9) + 
          raw.substring(10, 20) + 
          raw.substring(21, 31);
      } else {
        barcodeNumber = raw;
      }
      
      const valueStr = barcodeNumber.substring(9, 19);
      const value = parseInt(valueStr, 10) / 100;return value || null;
    } catch (error) {return null;
    }
  };

  const extractDateFromBarcode = (barcode) => {
    try {
      const raw = barcode.replace(/[^0-9]/g, '');
      
      if (raw.length < 44) return null;
      
      let barcodeNumber;
      if (raw.length === 47) {
        barcodeNumber = 
          raw.substring(0, 4) + 
          raw.substring(32, 47) + 
          raw.substring(4, 9) + 
          raw.substring(10, 20) + 
          raw.substring(21, 31);
      } else {
        barcodeNumber = raw;
      }
      
      const factor = parseInt(barcodeNumber.substring(5, 9), 10);
      
      const baseDate = new Date(1997, 9, 7);
      const baseDate2 = new Date(2025, 1, 22);
      
      let dueDate;
      
      if (factor === 0) {
        return null;
      } else if (factor >= 1000 && factor <= 9999) {
        dueDate = new Date(baseDate2);
        dueDate.setDate(dueDate.getDate() + (factor - 1000));
      } else {
        dueDate = new Date(baseDate);
        dueDate.setDate(dueDate.getDate() + factor);
      }return dueDate;
    } catch (error) {return null;
    }
  };

  const processBarcode = () => {
    if (!barcode) {
      setBarcodeError("Digite um código de barras");
      return { value: null, date: null };
    }
    
    setBarcodeProcessing(true);
    setBarcodeError("");
    
    try {
      const value = extractValueFromBarcode(barcode);
      const date = extractDateFromBarcode(barcode);
      
      // Armazena os valores extraídos
      setExtractedValue(value);
      setExtractedDueDate(date);
      
      if (value !== null && date) {
        checkIfDelayed(date);
        setBarcodeError("");
      } else {
        setBarcodeError("Não foi possível extrair informações deste código de barras");
      }
      
      setBarcodeProcessing(false);
      return { value, date };
    } catch (error) {
      setBarcodeError("Erro ao processar o código de barras");
      setBarcodeProcessing(false);
      return { value: null, date: null };
    }
  };

  const checkIfDelayed = (dueDate) => {
    if (!dueDate) return;
    
    const today = new Date();
    const due = new Date(dueDate);
    
    if (due < today) {
      const diffTime = Math.abs(today - due);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      setDelayInfo({
        delayed: true,
        days: diffDays
      });
    } else {
      setDelayInfo({
        delayed: false,
        days: 0
      });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(barcode);
    alert('Código de barras copiado!');
  };

  return {
    barcode,
    setBarcode,
    barcodeError,
    barcodeProcessing,
    extractedDueDate,
    extractedValue,
    delayInfo,
    handleBarcodeInput,
    processBarcode,
    copyToClipboard
  };
}

// Adicionando um export default que reexporta a função principal
export default { useBarcodeProcessor };