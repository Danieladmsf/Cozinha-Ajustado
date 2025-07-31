import { Input } from "./input";
import { Label } from "./label";

export const FormField = ({ 
  label, 
  name, 
  value, 
  onChange, 
  type = "text", 
  placeholder, 
  required = false, 
  icon,
  className = "",
  disabled = false,
  ...props 
}) => (
  <div className={className}>
    <Label htmlFor={name} className="flex items-center text-sm font-medium text-gray-700 mb-1">
      {icon && <span className="mr-1.5">{icon}</span>}
      {label} {required && <span className="text-red-500 ml-1">*</span>}
    </Label>
    <Input
      id={name}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      className="w-full"
      {...props}
    />
  </div>
);

export const CurrencyField = ({ label, name, value, onChange, required = false, ...props }) => (
  <FormField
    label={label}
    name={name}
    value={value}
    onChange={onChange}
    type="text"
    placeholder="0,00"
    required={required}
    icon="R$"
    {...props}
  />
);

export const WeightField = ({ label, name, value, onChange, required = false, ...props }) => (
  <FormField
    label={label}
    name={name}
    value={value}
    onChange={onChange}
    type="text"
    placeholder="0,000"
    required={required}
    icon="⚖️"
    {...props}
  />
);

export const PercentageField = ({ label, name, value, onChange, required = false, ...props }) => (
  <FormField
    label={label}
    name={name}
    value={value}
    onChange={onChange}
    type="text"
    placeholder="0,00"
    required={required}
    icon="%"
    {...props}
  />
);