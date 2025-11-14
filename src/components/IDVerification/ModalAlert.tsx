import React, {
  useRef,
  useImperativeHandle,
  forwardRef,
  CSSProperties,
} from "react";

export type ModalAlertHandle = {
  alert: (message: string) => void;
};

const dialogStyle: CSSProperties = {
  padding: "1.5rem",
  borderRadius: "8px",
  border: "none",
  maxWidth: "90%",
  width: "400px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
};

const buttonStyle: CSSProperties = {
  marginTop: "1rem",
  marginRight: "1rem",

  padding: "0.5rem 1rem",
  borderRadius: "4px",
  border: "none",
  backgroundColor: "#007bff",
  color: "#fff",
  cursor: "pointer",
  fontSize: "1rem",
};

const ModalAlert = forwardRef<ModalAlertHandle>(function ModalAlert(_, ref) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const messageRef = useRef<HTMLParagraphElement>(null);

  useImperativeHandle(ref, () => ({
    alert: (msg: string) => {
      if (!dialogRef.current || !messageRef.current) return;
      messageRef.current.textContent = msg;
      dialogRef.current.showModal();
    },
  }));
  //alignItems:'center'
  const close = () => dialogRef.current?.close();

  return (
    <>
      <style>
        {`
          dialog::backdrop {
            background: rgba(0,0,0,0.5);
          }
        `}
      </style>

      <dialog ref={dialogRef} style={dialogStyle}>
        <p ref={messageRef} style={{ margin: 0 }} />
        <div>
          <button type="button" onClick={close} style={buttonStyle}>
            OK
          </button>
          <a
            href="mailto:tech@rented123.com;tambi@rented123.com"
            onClick={close}
            style={{ textDecoration: "underline" }}
          >
            Contact Us
          </a>
        </div>
      </dialog>
    </>
  );
});

export default ModalAlert;
