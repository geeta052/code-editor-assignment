import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tooltip } from "@radix-ui/react-tooltip";

const OnlineMembers = ({ name }) => {
  return (
    <div>
      <TooltipProvider>
        <Tooltip>
          <TooltipContent>
            <p>{name}</p>
          </TooltipContent>
          <TooltipTrigger>
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
          </TooltipTrigger>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default OnlineMembers;
