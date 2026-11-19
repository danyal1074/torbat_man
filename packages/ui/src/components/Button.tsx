import React from 'react';
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
}
export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', isLoading = false, leftIcon, rightIcon, fullWidth = false, className = '', disabled, ...props }) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer select-none rounded-xl active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 min-h-[44px]';
    const variants = {
        primary: 'bg-[#6F248E] text-white hover:bg-[#5D1C78] shadow-sm',
        secondary: 'bg-[#F5EDF9] text-[#6F248E] hover:bg-[#EBDCF2]',
        outline: 'border border-[#E9E6EE] bg-white text-[#20212A] hover:bg-[#FAFAFC]',
        ghost: 'text-[#6F248E] hover:bg-[#F5EDF9]',
        danger: 'bg-[#DC2626] text-white hover:bg-[#B91C1C] shadow-sm',
    };
    const sizes = {
        sm: 'text-xs px-3 py-2 gap-1.5 h-9 min-h-[36px]',
        md: 'text-sm px-4 py-2.5 gap-2 min-h-[44px]',
        lg: 'text-base px-6 py-3.5 gap-2.5 min-h-[48px]',
    };
    return (<button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`} disabled={disabled || isLoading} {...props}>
      {isLoading ? (<span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"/>) : (<>
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          <span>{children}</span>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
        </>)}
    </button>);
};
