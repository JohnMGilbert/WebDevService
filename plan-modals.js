window.addEventListener("DOMContentLoaded", () => {
  const contactSection = document.querySelector("#contact");

  const closeModal = (modal) => {
    if (modal?.open) {
      modal.close();
    }
  };

  document.querySelectorAll("[data-plan-modal-open]").forEach((button) => {
    button.addEventListener("click", () => {
      const modal = document.getElementById(button.dataset.planModalOpen);

      if (modal instanceof HTMLDialogElement) {
        modal.showModal();
      }
    });
  });

  document.querySelectorAll(".plan-modal").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal(modal);
      }
    });

    modal.querySelectorAll("[data-plan-modal-close]").forEach((button) => {
      button.addEventListener("click", () => closeModal(modal));
    });

    modal.querySelectorAll("[data-plan-contact]").forEach((button) => {
      button.addEventListener("click", () => {
        closeModal(modal);
        contactSection?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  });
});
