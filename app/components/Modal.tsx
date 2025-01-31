import React, { type ReactNode } from "react";
import { FocusScope, Overlay, useModalOverlay } from "react-aria";
import { NavLink, useLocation } from "react-router";
import { useOverlayTriggerState } from "react-stately";

interface ModalProps {
  title: string;
  onClose?: () => void;
  children: ReactNode;
}
export const Modal: React.FC<ModalProps> = ({
  title,
  children,
  onClose,
  ...rest
}) => {
  const location = useLocation();

  const state = useOverlayTriggerState(rest);

  const ref = React.useRef(null);

  const { modalProps, underlayProps } = useModalOverlay(rest, state, ref);
  return (
    <Overlay>
      <FocusScope contain restoreFocus autoFocus>
        <div
          className="fixed text-black inset-0 z-10 flex flex-col items-center justify-center p-8 backdrop-brightness-90"
          {...underlayProps}
        >
          <div {...modalProps} ref={ref} className="max-h-full">
            <div className="flex max-h-full flex-col rounded-lg bg-white shadow-md">
              <div className="flex items-center justify-between bg-neutral-100 pl-4">
                <div className="font-semibold">{title}</div>
                <NavLink
                  to={`..${location.search}`}
                  /* onClick={() => onClose?.()} */
                  className="flex size-10 items-center justify-center hover:bg-red-300"
                >
                  ✕
                </NavLink>
              </div>
              <div className="overflow-auto">{children}</div>
            </div>
          </div>
        </div>
      </FocusScope>
    </Overlay>
  );
};
