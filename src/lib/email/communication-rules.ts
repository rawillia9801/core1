export type CommunicationRuleMode =
  | "preview_only"
  | "staff_review_required"
  | "eligible_for_later_automation"
  | "internal_only";

export type CommunicationRule = {
  templateKey: string;
  label: string;
  mode: CommunicationRuleMode;
  customerDeliveryAllowedNow: false;
  automaticDeliveryAllowedNow: false;
  staffApprovalRequiredBeforeSend: boolean;
  reason: string;
  requiredBeforeAnySend: string[];
};

const commonRequirements = [
  "approved final template copy",
  "recipient override safety for staging",
  "delivery-attempt logging",
  "duplicate-send protection",
  "owner/admin approval",
];

export const COMMUNICATION_RULES: CommunicationRule[] = [
  {
    templateKey: "application_received",
    label: "Application received",
    mode: "eligible_for_later_automation",
    customerDeliveryAllowedNow: false,
    automaticDeliveryAllowedNow: false,
    staffApprovalRequiredBeforeSend: true,
    reason:
      "This is the safest future transactional candidate, but it must remain preview-only until test-send-to-owner and delivery controls are proven.",
    requiredBeforeAnySend: commonRequirements,
  },
  {
    templateKey: "application_approved",
    label: "Application approved",
    mode: "staff_review_required",
    customerDeliveryAllowedNow: false,
    automaticDeliveryAllowedNow: false,
    staffApprovalRequiredBeforeSend: true,
    reason:
      "Approval language can affect customer expectations and must be staff-reviewed before any delivery.",
    requiredBeforeAnySend: commonRequirements,
  },
  {
    templateKey: "reservation_created",
    label: "Reservation created",
    mode: "staff_review_required",
    customerDeliveryAllowedNow: false,
    automaticDeliveryAllowedNow: false,
    staffApprovalRequiredBeforeSend: true,
    reason:
      "Reservation notices can affect puppy availability, deposit expectations, and next-step obligations.",
    requiredBeforeAnySend: commonRequirements,
  },
  {
    templateKey: "payment_received",
    label: "Payment received",
    mode: "staff_review_required",
    customerDeliveryAllowedNow: false,
    automaticDeliveryAllowedNow: false,
    staffApprovalRequiredBeforeSend: true,
    reason:
      "Payment messages must not imply processor settlement until payment reconciliation exists.",
    requiredBeforeAnySend: [
      ...commonRequirements,
      "payment processor reconciliation language",
      "receipt metadata foundation",
    ],
  },
  {
    templateKey: "payment_reminder",
    label: "Payment reminder",
    mode: "staff_review_required",
    customerDeliveryAllowedNow: false,
    automaticDeliveryAllowedNow: false,
    staffApprovalRequiredBeforeSend: true,
    reason:
      "Payment reminders must be reviewed for balance accuracy, timing, and payment-plan language.",
    requiredBeforeAnySend: [
      ...commonRequirements,
      "payment-plan status review",
      "balance verification workflow",
    ],
  },
  {
    templateKey: "reservation_cancelled",
    label: "Reservation cancelled",
    mode: "staff_review_required",
    customerDeliveryAllowedNow: false,
    automaticDeliveryAllowedNow: false,
    staffApprovalRequiredBeforeSend: true,
    reason:
      "Cancellation messages must never imply a refund unless a separate refund workflow has actually run.",
    requiredBeforeAnySend: [
      ...commonRequirements,
      "refund/no-refund language approval",
      "reservation cancellation audit review",
    ],
  },
  {
    templateKey: "go_home_reminder",
    label: "Go-home reminder",
    mode: "staff_review_required",
    customerDeliveryAllowedNow: false,
    automaticDeliveryAllowedNow: false,
    staffApprovalRequiredBeforeSend: true,
    reason:
      "Go-home reminders depend on balance clearance, scheduling, puppy readiness, and pickup/delivery context.",
    requiredBeforeAnySend: [
      ...commonRequirements,
      "go-home readiness workflow",
      "balance clearance display",
    ],
  },
  {
    templateKey: "document_ready",
    label: "Document ready",
    mode: "staff_review_required",
    customerDeliveryAllowedNow: false,
    automaticDeliveryAllowedNow: false,
    staffApprovalRequiredBeforeSend: true,
    reason:
      "Document notices must wait for document generation, storage visibility, and signature rules.",
    requiredBeforeAnySend: [
      ...commonRequirements,
      "document generation workflow",
      "document visibility rules",
    ],
  },
  {
    templateKey: "staff_alert",
    label: "Staff alert",
    mode: "internal_only",
    customerDeliveryAllowedNow: false,
    automaticDeliveryAllowedNow: false,
    staffApprovalRequiredBeforeSend: false,
    reason:
      "Staff alerts are internal operational messages and must not be sent to customers.",
    requiredBeforeAnySend: [
      "internal recipient rules",
      "staff notification destination rules",
    ],
  },
];

export function getCommunicationRule(templateKey: string | null | undefined) {
  return COMMUNICATION_RULES.find((rule) => rule.templateKey === templateKey) ?? null;
}

export function getCommunicationRuleSummary() {
  return {
    totalRules: COMMUNICATION_RULES.length,
    customerDeliveryAllowedNow: 0,
    automaticDeliveryAllowedNow: 0,
    previewOnly: COMMUNICATION_RULES.filter((rule) => rule.mode === "preview_only").length,
    staffReviewRequired: COMMUNICATION_RULES.filter(
      (rule) => rule.mode === "staff_review_required",
    ).length,
    eligibleForLaterAutomation: COMMUNICATION_RULES.filter(
      (rule) => rule.mode === "eligible_for_later_automation",
    ).length,
    internalOnly: COMMUNICATION_RULES.filter((rule) => rule.mode === "internal_only").length,
  };
}
