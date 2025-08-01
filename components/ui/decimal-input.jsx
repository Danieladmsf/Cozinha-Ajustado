import * as React from "react"
import { cn } from "@/lib/utils"
import { parseQuantity } from "@/components/utils/orderUtils"

const DecimalInput = React.forwardRef(({ 
  className, 
  value, 
  onChange, 
  disabled,
  placeholder = "0",
  ...props 
}, ref) => {
  const [displayValue, setDisplayValue] = React.useState('');

  // Update display value when prop value changes
  React.useEffect(() => {
    if (value === 0 || value === null || value === undefined) {
      setDisplayValue('');
    } else {
      setDisplayValue(String(value).replace('.', ','));
    }
  }, [value]);

  const handleChange = (e) => {
    const inputValue = e.target.value;
    
    // Allow empty input
    if (inputValue === '') {
      setDisplayValue('');
      if (onChange) {
        onChange({ target: { value: '' } });
      }
      return;
    }

    // Allow only numbers, comma, and backspace/delete
    const validChars = /^[0-9,]*$/;
    if (!validChars.test(inputValue)) {
      return;
    }

    // Prevent multiple commas
    const commaCount = (inputValue.match(/,/g) || []).length;
    if (commaCount > 1) {
      return;
    }

    // Update display value
    setDisplayValue(inputValue);
    
    // Parse and send the numeric value
    if (onChange) {
      onChange({ target: { value: inputValue } });
    }
  };

  const handleKeyDown = (e) => {
    // Allow backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
        // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.keyCode === 65 && e.ctrlKey === true) ||
        (e.keyCode === 67 && e.ctrlKey === true) ||
        (e.keyCode === 86 && e.ctrlKey === true) ||
        (e.keyCode === 88 && e.ctrlKey === true)) {
      return;
    }

    // Allow numbers
    if ((e.keyCode >= 48 && e.keyCode <= 57) || (e.keyCode >= 96 && e.keyCode <= 105)) {
      return;
    }

    // Allow comma if there isn't one already
    if (e.key === ',' && !displayValue.includes(',')) {
      return;
    }

    // Block everything else
    e.preventDefault();
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      placeholder={placeholder}
      ref={ref}
      {...props}
    />
  );
});

DecimalInput.displayName = "DecimalInput";

export { DecimalInput };