import { useDetailModal, useDetailModalState } from "@ethio/plugin-sdk";

import { Dialog } from "@/components/ui/dialog";

/** Renders the host detail modal opened via useDetailModal(). */
export function DetailModalHost() {
  const { open, content } = useDetailModalState();
  const { close } = useDetailModal();

  return (
    <Dialog
      open={open && Boolean(content)}
      onClose={close}
      title={content?.title ?? ""}
      description={content?.description}
      className={content?.className}
    >
      {content?.body}
    </Dialog>
  );
}
