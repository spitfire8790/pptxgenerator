import * as React from "react"
import { cn } from "../../lib/utils"

const Button = React.forwardRef(({ 
  className, 
  variant = "default", 
  size = "default", 
  asChild = false,
  type = "button",
  ...props 
}, ref) => {
  const Comp = asChild ? "div" : "button"
  
  const baseStyles = [
    "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50"
  ].join(" ")
  
  const variants = {
    default: "bg-navy-600 text-white shadow hover:bg-navy-700",
    outline: [
      "border border-gray-300 bg-white text-gray-900",
      "hover:bg-gray-50 hover:text-gray-900",
      "focus:bg-gray-50",
      "active:bg-gray-100"
    ].join(" "),
    selected: "border border-navy-600 bg-navy-600 text-white shadow-sm",
    ghost: "hover:bg-gray-100 hover:text-gray-900",
    link: "text-navy-600 underline-offset-4 hover:underline",
  }

  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-10 rounded-md px-8",
    icon: "h-9 w-9",
  }

  return (
    <Comp
      type={asChild ? undefined : type}
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button }
