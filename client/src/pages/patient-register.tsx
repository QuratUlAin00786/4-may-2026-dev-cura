import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { apiRequest, buildUrl } from "@/lib/queryClient";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const FORM_MAX_WIDTH = "max-w-6xl mx-auto w-full";

const COUNTRY_OPTIONS = [
  "United Kingdom",
  "United States",
  "Pakistan",
  "India",
  "Ireland",
  "Canada",
  "Australia",
  "Other",
];

function startOfTodayUtcDate(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function parseIsoDateOnlyUTC(value: string): Date | null {
  const s = String(value || "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const day = parseInt(m[3], 10);
  const dt = new Date(Date.UTC(y, mo, day));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo || dt.getUTCDate() !== day) return null;
  return dt;
}

function ageYearsFromDobUTC(dob: Date): number {
  const today = startOfTodayUtcDate();
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const m = today.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getSubdomainFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length >= 1 && parts[0] !== "api") return parts[0];
  return null;
}

export default function PublicPatientRegisterPage() {
  const [location, setLocation] = useLocation();
  const subdomain = useMemo(() => getSubdomainFromPath(location), [location]);
  const { toast } = useToast();

  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const tokenParam = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenErrorTitle, setTokenErrorTitle] = useState("Registration link is invalid");
  const [tokenErrorMessage, setTokenErrorMessage] = useState("Please ask the clinic to send a new registration link.");
  const [showTokenError, setShowTokenError] = useState(false);
  const [emailLocked, setEmailLocked] = useState("");
  const [portalAccess, setPortalAccess] = useState<boolean>(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [genderAtBirth, setGenderAtBirth] = useState("");
  const [nhsNumber, setNhsNumber] = useState("");

  const [includeDependentChild, setIncludeDependentChild] = useState(false);
  const [depFirstName, setDepFirstName] = useState("");
  const [depLastName, setDepLastName] = useState("");
  const [depDateOfBirth, setDepDateOfBirth] = useState("");
  const [depGenderAtBirth, setDepGenderAtBirth] = useState("");
  const [depNhsNumber, setDepNhsNumber] = useState("");
  const [depPhone, setDepPhone] = useState("");

  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState("United Kingdom");
  const [postcodeLookupLoading, setPostcodeLookupLoading] = useState(false);

  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyEmail, setEmergencyEmail] = useState("");

  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [insurancePlanType, setInsurancePlanType] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [memberNumber, setMemberNumber] = useState("");
  const [insuranceEffectiveDate, setInsuranceEffectiveDate] = useState("");

  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [consentAccepted, setConsentAccepted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const clearFieldError = useCallback((key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!subdomain || !tokenParam) {
        setLoading(false);
        setTokenValid(false);
        setTokenErrorTitle("Registration link is invalid");
        setTokenErrorMessage("Please ask the clinic to send a new registration link.");
        setShowTokenError(true);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          buildUrl(`/api/public/${encodeURIComponent(subdomain)}/patient-registration-token/${encodeURIComponent(tokenParam)}`),
          {
            method: "GET",
            headers: { "X-Tenant-Subdomain": subdomain },
            credentials: "include",
          },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setTokenValid(false);
          setTokenErrorTitle("Registration link is invalid");
          setTokenErrorMessage(String(data?.error || "Please ask the clinic to send a new registration link."));
          setShowTokenError(true);
          return;
        }
        setTokenValid(true);
        setShowTokenError(false);
        setEmailLocked(String(data?.email || "").trim());
        setPortalAccess(!!data?.portalAccess);
      } catch (e: any) {
        setTokenValid(false);
        setTokenErrorTitle("Registration link is invalid");
        setTokenErrorMessage("Please ask the clinic to send a new registration link.");
        setShowTokenError(true);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [subdomain, tokenParam, toast]);

  const handleLookupPostcode = async () => {
    if (country !== "United Kingdom") {
      toast({ title: "Postcode lookup is available when country is United Kingdom", variant: "destructive" });
      return;
    }
    const pc = postcode.trim();
    if (!pc) {
      toast({ title: "Enter a postcode first", variant: "destructive" });
      return;
    }
    setPostcodeLookupLoading(true);
    try {
      if (!subdomain) {
        toast({ title: "Missing clinic subdomain", variant: "destructive" });
        return;
      }
      const r = await fetch(
        buildUrl(`/api/public/${encodeURIComponent(subdomain)}/postcode-lookup?postcode=${encodeURIComponent(pc)}`),
        {
          method: "GET",
          headers: { "X-Tenant-Subdomain": subdomain },
          credentials: "include",
        },
      );
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast({ title: j?.error || "Could not find that postcode", variant: "destructive" });
        return;
      }
      const result = j?.result;
      if (result?.admin_district) setCity(String(result.admin_district));
      if (result?.region) setState(String(result.region));
    } catch {
      toast({ title: "Postcode lookup failed", variant: "destructive" });
    } finally {
      setPostcodeLookupLoading(false);
    }
  };

  const validate = (): boolean => {
    const err: Record<string, string> = {};
    if (!firstName.trim()) err.firstName = "First name is required";
    if (!lastName.trim()) err.lastName = "Last name is required";
    if (!genderAtBirth) err.genderAtBirth = "Please select gender at birth";
    if (!dateOfBirth) err.dateOfBirth = "Date of birth is required";
    else {
      const selfDob = parseIsoDateOnlyUTC(dateOfBirth);
      if (!selfDob) err.dateOfBirth = "Enter a valid date of birth";
      else {
        const today = startOfTodayUtcDate();
        if (selfDob.getTime() > today.getTime()) err.dateOfBirth = "Date of birth cannot be in the future";
        else if (ageYearsFromDobUTC(selfDob) > 130) err.dateOfBirth = "Please check the date of birth";
      }
    }
    if (!phone.trim()) err.phone = "Phone number is required";
    if (!emergencyName.trim()) err.emergencyName = "Emergency contact name is required";
    if (!emergencyRelationship) err.emergencyRelationship = "Emergency contact relationship is required";
    if (!emergencyPhone.trim()) err.emergencyPhone = "Emergency contact phone is required";
    const ecMail = emergencyEmail.trim();
    if (ecMail && !EMAIL_RE.test(ecMail)) err.emergencyEmail = "Enter a valid email or leave blank";
    if (!consentAccepted) err.consent = "You must accept the terms to continue";

    const nhsDigits = nhsNumber.replace(/\s/g, "");
    if (nhsDigits && !/^\d{10}$/.test(nhsDigits)) err.nhsNumber = "NHS number must be 10 digits";

    if (insuranceEffectiveDate.trim()) {
      if (!parseIsoDateOnlyUTC(insuranceEffectiveDate)) err.insuranceEffectiveDate = "Enter a valid effective date";
    }

    if (portalAccess) {
      const p = password.trim();
      const c = confirmPassword.trim();
      if (p && p.length < 8) err.password = "Password must be at least 8 characters";
      if (p && p !== c) err.confirmPassword = "Passwords do not match";
    }

    if (includeDependentChild) {
      if (!depFirstName.trim()) err.depFirstName = "Dependent first name is required";
      if (!depLastName.trim()) err.depLastName = "Dependent last name is required";
      if (!depDateOfBirth) err.depDateOfBirth = "Dependent date of birth is required";
      else {
        const depDob = parseIsoDateOnlyUTC(depDateOfBirth);
        if (!depDob) err.depDateOfBirth = "Enter a valid dependent date of birth";
        else {
          const today = startOfTodayUtcDate();
          if (depDob.getTime() > today.getTime()) err.depDateOfBirth = "Dependent date of birth cannot be in the future";
          else if (ageYearsFromDobUTC(depDob) >= 18) {
            err.depDateOfBirth = "Dependent must be under 18. Register adults separately.";
          }
        }
      }
      if (!depGenderAtBirth) err.depGenderAtBirth = "Please select dependent gender at birth";
      const depNhsDigits = depNhsNumber.replace(/\s/g, "");
      if (depNhsDigits && !/^\d{10}$/.test(depNhsDigits)) err.depNhsNumber = "NHS number must be 10 digits";
    }

    setFieldErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async () => {
    if (!subdomain || !tokenParam) return;
    if (!validate()) {
      toast({ title: "Please fix the highlighted fields", variant: "destructive" });
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        token: tokenParam,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: emailLocked,
        phone: phone.trim(),
        dateOfBirth,
        genderAtBirth,
        nhsNumber: nhsNumber.trim(),
        address: {
          street: street.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          postcode: postcode.trim() || undefined,
          country: country.trim() || undefined,
        },
        emergencyContact: {
          name: emergencyName.trim(),
          relationship: emergencyRelationship,
          phone: emergencyPhone.trim(),
          email: emergencyEmail.trim(),
        },
        insuranceInfo: {
          provider: insuranceProvider.trim() || undefined,
          planType: insurancePlanType.trim() || undefined,
          policyNumber: policyNumber.trim() || undefined,
          memberNumber: memberNumber.trim() || undefined,
          effectiveDate: insuranceEffectiveDate || undefined,
        },
        includeDependentChild,
        dependentChild: includeDependentChild
          ? {
              firstName: depFirstName.trim(),
              lastName: depLastName.trim(),
              dateOfBirth: depDateOfBirth,
              genderAtBirth: depGenderAtBirth,
              nhsNumber: depNhsNumber.trim(),
              phone: depPhone.trim(),
            }
          : {},
        department: portalAccess ? department.trim() : "",
        password: portalAccess ? password.trim() : "",
        confirmPassword: portalAccess ? confirmPassword.trim() : "",
        consentAccepted: true,
      };
      const res = await fetch(
        buildUrl(`/api/public/${encodeURIComponent(subdomain)}/patient-self-register`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Tenant-Subdomain": subdomain,
          },
          credentials: "include",
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        let description: string | undefined;
        if (Array.isArray(data?.details)) {
          description = data.details
            .map((x: { message?: string; path?: (string | number)[] }) => {
              const p = Array.isArray(x.path) ? x.path.join(".") : "";
              return x.message ? (p ? `${p}: ${x.message}` : x.message) : p || "Invalid field";
            })
            .join("; ");
        } else if (typeof data?.details === "string") {
          description = data.details;
        }
        toast({
          title: data?.error || "Registration failed",
          description,
          variant: "destructive",
        });
        return;
      }
      setShowSuccess(true);
    } catch (e: any) {
      toast({ title: "Registration failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header title="Patient Registration" subtitle="Loading…" />
        <div className={`${FORM_MAX_WIDTH} p-6`}>
          <Card>
            <CardContent className="p-6 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Validating registration link…
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header title="Patient Registration" subtitle="Link not valid" />

        <Dialog
          open={showTokenError}
          onOpenChange={(open) => {
            setShowTokenError(open);
            if (!open) {
              // If the user dismisses the dialog, route them to login
              if (subdomain) setLocation(`/${encodeURIComponent(subdomain)}/auth/login`);
              else setLocation("/auth/login");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{tokenErrorTitle}</DialogTitle>
              <DialogDescription>{tokenErrorMessage}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                onClick={() => {
                  if (subdomain) setLocation(`/${encodeURIComponent(subdomain)}/auth/login`);
                  else setLocation("/auth/login");
                }}
              >
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
      <Header title="Patient Registration" subtitle="Complete your details" />

      <div className={`${FORM_MAX_WIDTH} p-6 space-y-6`}>
        <Card>
          <CardHeader>
            <CardTitle>Self-registration form</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="text-sm rounded-md border px-3 py-2 bg-gray-50 dark:bg-gray-900/30 break-all">
                {emailLocked || "-"}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Email is locked to the clinic invite.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    clearFieldError("firstName");
                  }}
                  className={fieldErrors.firstName ? "border-red-500" : ""}
                />
                {fieldErrors.firstName && <p className="text-xs text-red-600">{fieldErrors.firstName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    clearFieldError("lastName");
                  }}
                  className={fieldErrors.lastName ? "border-red-500" : ""}
                />
                {fieldErrors.lastName && <p className="text-xs text-red-600">{fieldErrors.lastName}</p>}
              </div>
            </div>

            <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/80 dark:bg-blue-950/30 p-4 space-y-4">
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100">Personal information</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">Date of birth and gender at birth</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => {
                      setDateOfBirth(e.target.value);
                      clearFieldError("dateOfBirth");
                    }}
                    className={fieldErrors.dateOfBirth ? "border-red-500" : ""}
                  />
                  {fieldErrors.dateOfBirth && <p className="text-xs text-red-600">{fieldErrors.dateOfBirth}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Gender at birth</Label>
                  <Select
                    value={genderAtBirth}
                    onValueChange={(v) => {
                      setGenderAtBirth(v);
                      clearFieldError("genderAtBirth");
                    }}
                  >
                    <SelectTrigger className={fieldErrors.genderAtBirth ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select gender…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldErrors.genderAtBirth && <p className="text-xs text-red-600">{fieldErrors.genderAtBirth}</p>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    clearFieldError("phone");
                  }}
                  placeholder="+44…"
                  className={fieldErrors.phone ? "border-red-500" : ""}
                />
                {fieldErrors.phone && <p className="text-xs text-red-600">{fieldErrors.phone}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="nhs">NHS number (optional)</Label>
                <Input
                  id="nhs"
                  value={nhsNumber}
                  onChange={(e) => {
                    setNhsNumber(e.target.value);
                    clearFieldError("nhsNumber");
                  }}
                  placeholder="10 digits"
                  className={fieldErrors.nhsNumber ? "border-red-500" : ""}
                />
                {fieldErrors.nhsNumber && <p className="text-xs text-red-600">{fieldErrors.nhsNumber}</p>}
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="dependantChildren"
                  checked={includeDependentChild}
                  onCheckedChange={(v) => {
                    const on = v === true;
                    setIncludeDependentChild(on);
                    if (!on) {
                      setDepFirstName("");
                      setDepLastName("");
                      setDepDateOfBirth("");
                      setDepGenderAtBirth("");
                      setDepNhsNumber("");
                      setDepPhone("");
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.depFirstName;
                        delete next.depLastName;
                        delete next.depDateOfBirth;
                        delete next.depGenderAtBirth;
                        delete next.depNhsNumber;
                        return next;
                      });
                    }
                  }}
                />
                <div className="space-y-1">
                  <Label htmlFor="dependantChildren" className="text-sm font-medium cursor-pointer leading-snug">
                    Dependant children
                  </Label>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Register a dependent child under the same account. They will be linked as <strong>Dependent Child</strong> with the
                    same login email{portalAccess ? " and portal user" : ""} as you. Address and emergency contact below apply to both
                    profiles.
                  </p>
                </div>
              </div>

              {includeDependentChild && (
                <div className="pt-2 border-t border-amber-200/80 dark:border-amber-900/40 space-y-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Dependent child details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="depFirstName">First name</Label>
                      <Input
                        id="depFirstName"
                        value={depFirstName}
                        onChange={(e) => {
                          setDepFirstName(e.target.value);
                          clearFieldError("depFirstName");
                        }}
                        className={fieldErrors.depFirstName ? "border-red-500" : ""}
                      />
                      {fieldErrors.depFirstName && <p className="text-xs text-red-600">{fieldErrors.depFirstName}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="depLastName">Last name</Label>
                      <Input
                        id="depLastName"
                        value={depLastName}
                        onChange={(e) => {
                          setDepLastName(e.target.value);
                          clearFieldError("depLastName");
                        }}
                        className={fieldErrors.depLastName ? "border-red-500" : ""}
                      />
                      {fieldErrors.depLastName && <p className="text-xs text-red-600">{fieldErrors.depLastName}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="depDob">Date of birth</Label>
                      <Input
                        id="depDob"
                        type="date"
                        value={depDateOfBirth}
                        onChange={(e) => {
                          setDepDateOfBirth(e.target.value);
                          clearFieldError("depDateOfBirth");
                        }}
                        className={fieldErrors.depDateOfBirth ? "border-red-500" : ""}
                      />
                      {fieldErrors.depDateOfBirth && <p className="text-xs text-red-600">{fieldErrors.depDateOfBirth}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Gender at birth</Label>
                      <Select
                        value={depGenderAtBirth}
                        onValueChange={(v) => {
                          setDepGenderAtBirth(v);
                          clearFieldError("depGenderAtBirth");
                        }}
                      >
                        <SelectTrigger className={fieldErrors.depGenderAtBirth ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select gender…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                      {fieldErrors.depGenderAtBirth && <p className="text-xs text-red-600">{fieldErrors.depGenderAtBirth}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="depPhone">Phone (optional)</Label>
                      <Input
                        id="depPhone"
                        value={depPhone}
                        onChange={(e) => setDepPhone(e.target.value)}
                        placeholder="If different from yours"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="depNhs">NHS number (optional)</Label>
                      <Input
                        id="depNhs"
                        value={depNhsNumber}
                        onChange={(e) => {
                          setDepNhsNumber(e.target.value);
                          clearFieldError("depNhsNumber");
                        }}
                        placeholder="10 digits"
                        className={fieldErrors.depNhsNumber ? "border-red-500" : ""}
                      />
                      {fieldErrors.depNhsNumber && <p className="text-xs text-red-600">{fieldErrors.depNhsNumber}</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Address</h3>
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="postcode">Postcode / ZIP</Label>
                  <Input id="postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="Postcode" />
                </div>
                {country === "United Kingdom" && (
                  <div className="flex items-end">
                    <Button type="button" variant="outline" onClick={handleLookupPostcode} disabled={postcodeLookupLoading}>
                      {postcodeLookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lookup"}
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="street">Street address</Label>
                <Input id="street" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Street" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City / town" />
                <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="State / region" />
              </div>
            </div>

            <div className="space-y-3 rounded-lg border p-4 bg-gray-50/80 dark:bg-gray-900/40">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Emergency contact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ecName">Name</Label>
                  <Input
                    id="ecName"
                    value={emergencyName}
                    onChange={(e) => {
                      setEmergencyName(e.target.value);
                      clearFieldError("emergencyName");
                    }}
                    className={fieldErrors.emergencyName ? "border-red-500" : ""}
                  />
                  {fieldErrors.emergencyName && <p className="text-xs text-red-600">{fieldErrors.emergencyName}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <Select
                    value={emergencyRelationship}
                    onValueChange={(v) => {
                      setEmergencyRelationship(v);
                      clearFieldError("emergencyRelationship");
                    }}
                  >
                    <SelectTrigger className={fieldErrors.emergencyRelationship ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Father", "Mother", "Son", "Daughter", "Brother", "Sister", "Husband", "Wife", "Friend", "Other"].map(
                        (r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  {fieldErrors.emergencyRelationship && (
                    <p className="text-xs text-red-600">{fieldErrors.emergencyRelationship}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ecPhone">Phone</Label>
                  <Input
                    id="ecPhone"
                    value={emergencyPhone}
                    onChange={(e) => {
                      setEmergencyPhone(e.target.value);
                      clearFieldError("emergencyPhone");
                    }}
                    placeholder="+44…"
                    className={fieldErrors.emergencyPhone ? "border-red-500" : ""}
                  />
                  {fieldErrors.emergencyPhone && <p className="text-xs text-red-600">{fieldErrors.emergencyPhone}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ecEmail">Email (optional)</Label>
                  <Input
                    id="ecEmail"
                    type="email"
                    value={emergencyEmail}
                    onChange={(e) => {
                      setEmergencyEmail(e.target.value);
                      clearFieldError("emergencyEmail");
                    }}
                    placeholder="emergency@example.com"
                    className={fieldErrors.emergencyEmail ? "border-red-500" : ""}
                  />
                  {fieldErrors.emergencyEmail && <p className="text-xs text-red-600">{fieldErrors.emergencyEmail}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-dashed p-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Health insurance (optional)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="insProvider">Insurance provider</Label>
                  <Input id="insProvider" value={insuranceProvider} onChange={(e) => setInsuranceProvider(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insPlan">Plan type</Label>
                  <Input id="insPlan" value={insurancePlanType} onChange={(e) => setInsurancePlanType(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="polNum">Policy number</Label>
                  <Input id="polNum" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memNum">Member number</Label>
                  <Input id="memNum" value={memberNumber} onChange={(e) => setMemberNumber(e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="insEff">Effective date</Label>
                  <Input
                    id="insEff"
                    type="date"
                    value={insuranceEffectiveDate}
                    onChange={(e) => {
                      setInsuranceEffectiveDate(e.target.value);
                      clearFieldError("insuranceEffectiveDate");
                    }}
                    className={fieldErrors.insuranceEffectiveDate ? "border-red-500" : ""}
                  />
                  {fieldErrors.insuranceEffectiveDate && (
                    <p className="text-xs text-red-600">{fieldErrors.insuranceEffectiveDate}</p>
                  )}
                </div>
              </div>
            </div>

            {portalAccess && (
              <div className="space-y-3 rounded-lg border p-4 bg-slate-50/80 dark:bg-slate-900/30">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Portal account</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Set a password below, or leave both fields blank and a temporary password will be emailed to you.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="dept">Department (optional)</Label>
                  <Input id="dept" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Department" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pw">Password (optional)</Label>
                  <div className="relative">
                    <Input
                      id="pw"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearFieldError("password");
                      }}
                      className={`pr-10 ${fieldErrors.password ? "border-red-500" : ""}`}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && <p className="text-xs text-red-600">{fieldErrors.password}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pw2">Confirm password (optional)</Label>
                  <div className="relative">
                    <Input
                      id="pw2"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        clearFieldError("confirmPassword");
                      }}
                      className={`pr-10 ${fieldErrors.confirmPassword ? "border-red-500" : ""}`}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && <p className="text-xs text-red-600">{fieldErrors.confirmPassword}</p>}
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 rounded-md border p-3">
              <Checkbox
                id="consent"
                checked={consentAccepted}
                onCheckedChange={(v) => {
                  setConsentAccepted(v === true);
                  clearFieldError("consent");
                }}
              />
              <div className="space-y-1">
                <Label htmlFor="consent" className="text-sm font-normal leading-snug cursor-pointer">
                  I confirm that the information provided is accurate and I agree to the clinic&apos;s registration and data
                  processing terms.
                </Label>
                {fieldErrors.consent && <p className="text-xs text-red-600">{fieldErrors.consent}</p>}
              </div>
            </div>

            <div className="pt-2">
              <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                {submitting ? "Submitting…" : "Submit registration"}
              </Button>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {portalAccess
                  ? "Portal access is enabled for this registration."
                  : "Portal access is not enabled for this registration — only your patient record will be created."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registration submitted</DialogTitle>
            <DialogDescription>Thank you. The clinic has received your details.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowSuccess(false);
                setLocation("/auth/login");
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
