import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "./button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover"

const Combobox = ({ options, value, onChange, placeholder = "Select an option", emptyText = "No results found." }) => {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeIndex, setActiveIndex] = React.useState(-1)
  const listRef = React.useRef(null)
  const inputRef = React.useRef(null)

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(option => 
      option.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  const scrollToOption = React.useCallback((index) => {
    if (listRef.current && index >= 0) {
      const element = listRef.current.children[index];
      if (element) {
        element.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, []);

  const handleSelect = React.useCallback((option) => {
    onChange(option);
    setOpen(false);
    setSearchQuery("");
    setActiveIndex(-1);
  }, [onChange]);

  const handleKeyDown = React.useCallback((e) => {
    const optionsLength = filteredOptions.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => {
          const next = prev < optionsLength - 1 ? prev + 1 : prev;
          scrollToOption(next);
          return next;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => {
          const next = prev > 0 ? prev - 1 : prev;
          scrollToOption(next);
          return next;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < optionsLength) {
          handleSelect(filteredOptions[activeIndex]);
        } else if (optionsLength === 1) {
          handleSelect(filteredOptions[0]);
        }
        break;
      case 'Escape':
        setOpen(false);
        break;
    }
  }, [filteredOptions, activeIndex, handleSelect, scrollToOption]);

  React.useEffect(() => {
    if (open && inputRef.current) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  return (
    <Popover 
      open={open} 
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) {
          setActiveIndex(-1);
          setSearchQuery("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn(
            "w-full justify-between bg-white hover:bg-gray-50",
            "text-left font-normal",
            !value && "text-gray-500"
          )}
        >
          <span className="block truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <div className="flex flex-col">
          <div className="flex items-center border-b px-3 bg-white">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={inputRef}
              className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={`Search ${placeholder.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveIndex(-1);
              }}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div 
            ref={listRef}
            className="max-h-[300px] overflow-y-auto p-1"
            role="listbox"
            tabIndex={-1}
          >
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-500">
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <div
                  key={option}
                  role="option"
                  aria-selected={value === option}
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    "flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                    "hover:bg-gray-100",
                    (value === option || index === activeIndex) && "bg-gray-100"
                  )}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="text-gray-900">{option}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { Combobox }
