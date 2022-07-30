import classNames from "classnames";
import { ComponentProps, forwardRef } from "react";

type Props = ComponentProps<"button">;

const IconButton = forwardRef<HTMLButtonElement, Props>((props, ref) => (
  <button
    {...props}
    className={classNames(
      "flex items-center justify-center bg-transparent rounded-full cursor-pointer active:bg-gray-800 hover:bg-gray-700 focus-visible:bg-gray-700 focus-visible:outline-2 focus-visible:outline-white p-2",
      props.className,
    )}
    ref={ref}
  />
));

IconButton.displayName = "IconButton";

export default IconButton;
