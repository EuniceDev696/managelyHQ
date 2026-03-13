import { useEffect, useMemo, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { api } from "../utils/api"
import { useAuthStore } from "../store/useAuthStore"
import { useAppStore } from "../store/useAppStore"
import { getPostAuthRedirect, readOnboardingData, setOnboardingCompleted, writeOnboardingData } from "../utils/onboarding"

const MAX_LOGO_SIZE = 2 * 1024 * 1024
const businessTypes = [
  "Barbers",
  "Clinics",
  "Salons",
  "Spa",
  "Makeup artist",
  "Gyms",
  "Fashion designer",
  "Photography & Videography",
  "Car Wash",
  "Event Planning",
  "Auto",
  "Other",
]
const currencies = ["NGN", "USD", "GBP", "EUR", "CAD", "ZAR"]
const durations = ["30", "45", "60"]
const steps = [
  { key: "basics", path: "/onboarding", title: "Tell us about your business" },
  { key: "brand", path: "/onboarding/brand", title: "Set up your brand" },
  { key: "finish", path: "/onboarding/finish", title: "Final touches" },
]

const getDefaultCurrency = () => {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || ""
    if (locale.startsWith("en-NG")) return "NGN"
    if (locale.startsWith("en-US")) return "USD"
    if (locale.startsWith("en-GB")) return "GBP"
    if (locale.startsWith("de") || locale.startsWith("fr") || locale.startsWith("it")) return "EUR"
  } catch {
    return "NGN"
  }
  return "NGN"
}

const getDefaultTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Lagos"
  } catch {
    return "Africa/Lagos"
  }
}

const getTimezoneOptions = () => {
  try {
    if (typeof Intl.supportedValuesOf === "function") {
      const values = Intl.supportedValuesOf("timeZone")
      if (Array.isArray(values) && values.length) return values
    }
  } catch {
    return ["Africa/Lagos", "UTC", "Europe/London", "America/New_York"]
  }
  return ["Africa/Lagos", "UTC", "Europe/London", "America/New_York"]
}

const isHexColor = (value) => /^#([0-9a-fA-F]{6})$/.test(value)
const isUrlSlug = (value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)

export default function OnboardingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = useAuthStore((state) => state.token)
  const business = useAppStore((state) => state.business)
  const setBusiness = useAppStore((state) => state.setBusiness)
  const saved = readOnboardingData(business)

  const timezoneOptions = useMemo(() => getTimezoneOptions(), [])
  const stepIndex = useMemo(() => {
    if (location.pathname.startsWith("/onboarding/brand")) return 1
    if (location.pathname.startsWith("/onboarding/finish")) return 2
    return 0
  }, [location.pathname])
  const savedBusinessType = saved.businessType || business?.type || "Salons"
  const savedBusinessTypeIsKnown = businessTypes.includes(savedBusinessType)

  const [form, setForm] = useState({
    businessName: saved.businessName || business?.name || "",
    businessType: savedBusinessTypeIsKnown ? savedBusinessType : "Other",
    customBusinessType: savedBusinessTypeIsKnown ? (saved.customBusinessType || "") : savedBusinessType,
    currency: saved.currency || getDefaultCurrency(),
    timezone: saved.timezone || getDefaultTimezone(),
    brandColor: saved.brandColor || business?.brandColor || "#18c491",
    logoDataUrl: saved.logoDataUrl || business?.logo || "",
    businessAddress: saved.businessAddress || business?.address || "",
    businessPhone: saved.businessPhone || "",
    bookingSlug: saved.bookingSlug || "",
    defaultDuration: saved.defaultDuration || "30",
  })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [logoError, setLogoError] = useState("")
  const resolvedBusinessType = form.businessType === "Other"
    ? form.customBusinessType.trim()
    : form.businessType

  useEffect(() => {
    const safeColor = isHexColor(form.brandColor) ? form.brandColor : "#18c491"
    document.documentElement.style.setProperty("--onboarding-brand", safeColor)
  }, [form.brandColor])

  useEffect(() => {
    if (!business) return
    setForm((prev) => ({
      ...prev,
      businessName: prev.businessName || business.name || "",
      businessType: prev.businessType || business.type || "Salons",
      customBusinessType:
        prev.customBusinessType || (!businessTypes.includes(business.type || "") ? business.type || "" : ""),
      brandColor: prev.brandColor || business.brandColor || "#18c491",
      logoDataUrl: prev.logoDataUrl || business.logo || "",
      businessAddress: prev.businessAddress || business.address || "",
      businessPhone: prev.businessPhone || business.phone || "",
      bookingSlug: prev.bookingSlug || business.bookingSlug || business.slug || "",
      currency: prev.currency || business.currency || getDefaultCurrency(),
      timezone: prev.timezone || business.timezone || getDefaultTimezone(),
      defaultDuration: prev.defaultDuration || String(business.defaultDuration || "30"),
    }))
  }, [business])

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: "" }))
    setSubmitError("")
  }

  const goToStep = (nextStepIndex) => {
    writeOnboardingData(form, business)
    navigate(steps[nextStepIndex].path)
  }

  const validateStep1 = () => {
    const nextErrors = {
      businessName: form.businessName.trim() ? "" : "Business name is required.",
      businessType: resolvedBusinessType ? "" : "Business type is required.",
      customBusinessType: form.businessType !== "Other" || form.customBusinessType.trim()
        ? ""
        : "Please tell us what services your business offers.",
      currency: form.currency ? "" : "Currency is required.",
      timezone: form.timezone ? "" : "Timezone is required.",
    }
    setErrors(nextErrors)
    return Object.values(nextErrors).every((value) => !value)
  }

  const validateStep2 = () => {
    const nextErrors = {
      brandColor: isHexColor(form.brandColor) ? "" : "Enter a valid hex color, e.g. #18c491.",
    }
    setErrors(nextErrors)
    return Object.values(nextErrors).every((value) => !value)
  }

  const validateStep3 = () => {
    const nextErrors = {
      bookingSlug: !form.bookingSlug || isUrlSlug(form.bookingSlug)
        ? ""
        : "Booking slug must be URL-safe (lowercase letters, numbers, hyphens).",
    }
    setErrors(nextErrors)
    return Object.values(nextErrors).every((value) => !value)
  }

  const handleLogoFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!["image/png", "image/jpeg", "image/svg+xml"].includes(file.type)) {
      setLogoError("Logo must be PNG, JPG, or SVG.")
      return
    }

    if (file.size > MAX_LOGO_SIZE) {
      setLogoError("Logo size must be 2MB or less.")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setLogoError("")
      setField("logoDataUrl", String(reader.result || ""))
    }
    reader.readAsDataURL(file)
  }

  const finishOnboarding = async () => {
    if (!token || !validateStep3()) return
    setSubmitting(true)
    setSubmitError("")

    const finalData = {
      ...form,
      businessName: form.businessName.trim(),
      businessType: resolvedBusinessType,
      bookingSlug: form.bookingSlug.trim().toLowerCase(),
    }

    try {
      const updatedBusiness = await api.completeOnboarding(token, {
        name: finalData.businessName,
        type: finalData.businessType,
        brandColor: finalData.brandColor,
        logo: finalData.logoDataUrl,
        currency: finalData.currency,
        timezone: finalData.timezone,
        address: finalData.businessAddress,
        phone: finalData.businessPhone,
        bookingSlug: finalData.bookingSlug,
        defaultDuration: Number(finalData.defaultDuration || 30),
      })

      setBusiness(updatedBusiness)
      writeOnboardingData({
        businessName: finalData.businessName,
        businessType: form.businessType,
        customBusinessType: form.customBusinessType,
        currency: finalData.currency,
        timezone: finalData.timezone,
        brandColor: finalData.brandColor,
        logoDataUrl: finalData.logoDataUrl,
        businessAddress: finalData.businessAddress,
        businessPhone: finalData.businessPhone,
        bookingSlug: finalData.bookingSlug,
        defaultDuration: finalData.defaultDuration,
      }, updatedBusiness)
      setOnboardingCompleted(true, updatedBusiness)
      navigate(getPostAuthRedirect(updatedBusiness), { replace: true })
    } catch (error) {
      setSubmitError(error.message || "Could not complete onboarding. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const canContinueStep1 = Boolean(
    form.businessName.trim() &&
    resolvedBusinessType &&
    form.currency &&
    form.timezone,
  )
  const canContinueStep2 = isHexColor(form.brandColor)

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-page via-muted/50 to-page px-5 py-14 sm:px-6">
      <div className="w-full max-w-xl rounded-xl border border-border bg-surface p-7 shadow-lg sm:p-8">
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-subdued">
            <span>Step {stepIndex + 1} of 3</span>
            <span>{steps[stepIndex].title}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {steps.map((step, index) => (
              <div
                key={step.key}
                className={`h-2 rounded-full transition-all duration-200 ${
                  index <= stepIndex ? "bg-primary-600" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {stepIndex === 0 ? (
          <section>
            <h1 className="text-3xl font-semibold tracking-tight text-strong">Tell us about your business</h1>
            <p className="mt-2 text-sm text-body">This helps us personalize your booking experience.</p>

            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="businessName" className="text-xs font-medium uppercase tracking-[0.18em] text-subdued">
                  Business Name
                </label>
                <input
                  id="businessName"
                  className="mt-2 w-full rounded-xl border border-border bg-page px-4 py-3 text-sm text-strong transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                  value={form.businessName}
                  onChange={(event) => setField("businessName", event.target.value)}
                />
                {errors.businessName ? <p className="mt-1 text-xs text-rose-500">{errors.businessName}</p> : null}
              </div>

              <div>
                <label htmlFor="businessType" className="text-xs font-medium uppercase tracking-[0.18em] text-subdued">
                  Business Type
                </label>
                <select
                  id="businessType"
                  className="mt-2 w-full rounded-xl border border-border bg-page px-4 py-3 text-sm text-strong transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                  value={form.businessType}
                  onChange={(event) => setField("businessType", event.target.value)}
                >
                  {businessTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {errors.businessType ? <p className="mt-1 text-xs text-rose-500">{errors.businessType}</p> : null}
              </div>

              {form.businessType === "Other" ? (
                <div>
                  <label htmlFor="customBusinessType" className="text-xs font-medium uppercase tracking-[0.18em] text-subdued">
                    What Services Do You Offer?
                  </label>
                  <input
                    id="customBusinessType"
                    className="mt-2 w-full rounded-xl border border-border bg-page px-4 py-3 text-sm text-strong transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                    value={form.customBusinessType}
                    onChange={(event) => setField("customBusinessType", event.target.value)}
                    placeholder="e.g. Pet grooming, home cleaning, tutoring"
                  />
                  {errors.customBusinessType ? <p className="mt-1 text-xs text-rose-500">{errors.customBusinessType}</p> : null}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="currency" className="text-xs font-medium uppercase tracking-[0.18em] text-subdued">
                    Currency
                  </label>
                  <select
                    id="currency"
                    className="mt-2 w-full rounded-xl border border-border bg-page px-4 py-3 text-sm text-strong transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                    value={form.currency}
                    onChange={(event) => setField("currency", event.target.value)}
                  >
                    {currencies.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                  {errors.currency ? <p className="mt-1 text-xs text-rose-500">{errors.currency}</p> : null}
                </div>
                <div>
                  <label htmlFor="timezone" className="text-xs font-medium uppercase tracking-[0.18em] text-subdued">
                    Timezone
                  </label>
                  <select
                    id="timezone"
                    className="mt-2 w-full rounded-xl border border-border bg-page px-4 py-3 text-sm text-strong transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                    value={form.timezone}
                    onChange={(event) => setField("timezone", event.target.value)}
                  >
                    {timezoneOptions.map((timezone) => (
                      <option key={timezone} value={timezone}>
                        {timezone}
                      </option>
                    ))}
                  </select>
                  {errors.timezone ? <p className="mt-1 text-xs text-rose-500">{errors.timezone}</p> : null}
                </div>
              </div>

            </div>

            <button
              type="button"
              disabled={!canContinueStep1}
              onClick={() => {
                if (!validateStep1()) return
                goToStep(1)
              }}
              className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Continue
            </button>
          </section>
        ) : null}

        {stepIndex === 1 ? (
          <section>
            <h1 className="text-3xl font-semibold tracking-tight text-strong">Set up your brand</h1>
            <p className="mt-2 text-sm text-body">Choose your color identity and logo.</p>

            <div className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
                <div>
                  <label htmlFor="brandColorPicker" className="text-xs font-medium uppercase tracking-[0.18em] text-subdued">
                    Brand Color
                  </label>
                  <input
                    id="brandColorPicker"
                    type="color"
                    className="mt-2 h-12 w-full cursor-pointer rounded-xl border border-border bg-page p-1"
                    value={form.brandColor}
                    onChange={(event) => setField("brandColor", event.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <label htmlFor="brandColorHex" className="text-xs font-medium uppercase tracking-[0.18em] text-subdued">
                    Hex
                  </label>
                  <input
                    id="brandColorHex"
                    type="text"
                    className="mt-2 w-full rounded-xl border border-border bg-page px-4 py-3 text-sm uppercase text-strong transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                    value={form.brandColor}
                    onChange={(event) => setField("brandColor", event.target.value.toUpperCase())}
                    placeholder="#18C491"
                  />
                  <p className="mt-1 text-xs text-subdued">You can type your hex color if the picker is hard to use.</p>
                  {errors.brandColor ? <p className="mt-1 text-xs text-rose-500">{errors.brandColor}</p> : null}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-page p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-subdued">Live preview</p>
                <div className="mt-3 flex items-center gap-3">
                  {form.logoDataUrl ? (
                    <img src={form.logoDataUrl} alt="Brand logo preview" className="h-8 w-8 rounded-md object-cover" />
                  ) : (
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted text-[10px] font-semibold text-subdued">
                      LOGO
                    </span>
                  )}
                  <span className="h-5 w-5 rounded-full border border-border bg-[var(--onboarding-brand)]" />
                  <button
                    type="button"
                    className="rounded-lg bg-[var(--onboarding-brand)] px-3 py-2 text-xs font-semibold text-white transition-all duration-200"
                  >
                    Sample Button
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="logoUpload" className="text-xs font-medium uppercase tracking-[0.18em] text-subdued">
                  Logo (Optional)
                </label>
                <input
                  id="logoUpload"
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                  className="mt-2 w-full rounded-xl border border-border bg-page px-4 py-3 text-sm text-strong transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                  onChange={handleLogoFile}
                />
                {logoError ? <p className="mt-1 text-xs text-rose-500">{logoError}</p> : null}

                {form.logoDataUrl ? (
                  <div className="mt-3 rounded-xl border border-border bg-page p-3">
                    <img src={form.logoDataUrl} alt="Logo preview" className="h-14 w-14 rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => setField("logoDataUrl", "")}
                      className="mt-2 text-xs font-medium text-rose-500 transition-colors duration-200 hover:text-rose-600"
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => goToStep(2)}
                disabled={!canContinueStep2}
                className="inline-flex w-full items-center justify-center rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!validateStep2()) return
                  goToStep(2)
                }}
                className="inline-flex w-full items-center justify-center rounded-xl border border-border bg-page px-4 py-3 text-sm font-medium text-strong transition-all duration-200 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canContinueStep2}
              >
                Skip for now
              </button>
            </div>
          </section>
        ) : null}

        {stepIndex === 2 ? (
          <section>
            <h1 className="text-3xl font-semibold tracking-tight text-strong">Final touches</h1>
            <p className="mt-2 text-sm text-body">Optional details to complete your setup.</p>

            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="businessAddress" className="text-xs font-medium uppercase tracking-[0.18em] text-subdued">
                  Business Address (Optional)
                </label>
                <input
                  id="businessAddress"
                  className="mt-2 w-full rounded-xl border border-border bg-page px-4 py-3 text-sm text-strong transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                  value={form.businessAddress}
                  onChange={(event) => setField("businessAddress", event.target.value)}
                />
              </div>

              <div>
                <label htmlFor="businessPhone" className="text-xs font-medium uppercase tracking-[0.18em] text-subdued">
                  Business Phone (Optional)
                </label>
                <input
                  id="businessPhone"
                  className="mt-2 w-full rounded-xl border border-border bg-page px-4 py-3 text-sm text-strong transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                  value={form.businessPhone}
                  onChange={(event) => setField("businessPhone", event.target.value)}
                />
              </div>

              <div>
                <label htmlFor="bookingSlug" className="text-xs font-medium uppercase tracking-[0.18em] text-subdued">
                  Booking Link Slug (Optional)
                </label>
                <input
                  id="bookingSlug"
                  className="mt-2 w-full rounded-xl border border-border bg-page px-4 py-3 text-sm text-strong transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                  value={form.bookingSlug}
                  onChange={(event) => setField("bookingSlug", event.target.value.toLowerCase().replace(/\s+/g, "-"))}
                  placeholder="yourbusiness"
                />
                {errors.bookingSlug ? <p className="mt-1 text-xs text-rose-500">{errors.bookingSlug}</p> : null}
              </div>

              <div>
                <label htmlFor="defaultDuration" className="text-xs font-medium uppercase tracking-[0.18em] text-subdued">
                  Default Booking Duration (Optional)
                </label>
                <select
                  id="defaultDuration"
                  className="mt-2 w-full rounded-xl border border-border bg-page px-4 py-3 text-sm text-strong transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                  value={form.defaultDuration}
                  onChange={(event) => setField("defaultDuration", event.target.value)}
                >
                  {durations.map((duration) => (
                    <option key={duration} value={duration}>
                      {duration} mins
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {submitError ? <p className="mt-4 text-sm text-rose-500">{submitError}</p> : null}

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => goToStep(1)}
                className="inline-flex w-full items-center justify-center rounded-xl border border-border bg-page px-4 py-3 text-sm font-medium text-strong transition-all duration-200 hover:bg-muted"
              >
                Back
              </button>
              <button
                type="button"
                onClick={finishOnboarding}
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                    Finishing...
                  </>
                ) : (
                  "Finish setup"
                )}
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  )
}
