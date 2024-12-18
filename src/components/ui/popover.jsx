import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { cn } from "../../lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef(({ className, align = "center", sideOffset = 4, ...props }, ref) => {
  const [width, setWidth] = React.useState(0)
  const triggerRef = React.useRef(null)

  React.useEffect(() => {
    if (triggerRef.current) {
      const trigger = triggerRef.current.parentElement?.previousElementSibling
      if (trigger) {
        const newWidth = trigger.offsetWidth
        setWidth(newWidth)
      }
    }
  }, [])

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        style={{ width: width > 0 ? width : 'var(--radix-popover-trigger-width)' }}
        className={cn(
          "z-50 rounded-md border bg-white shadow-md outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2",
          "data-[side=left]:slide-in-from-right-2",
          "data-[side=right]:slide-in-from-left-2",
          "data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        onOpenAutoFocus={(e) => {
          // Prevent auto-focus on open to allow input to receive focus
          e.preventDefault()
        }}
        {...props}
      >
        <span ref={triggerRef} className="hidden" />
        {props.children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
})
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }
