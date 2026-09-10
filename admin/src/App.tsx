import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

import {
  SectionTab,
  PropertyItem,
  PropertyType,
  UserProfile,
  ListingRequest,
  ClaimRequest,
  VerificationRequest,
  StudentBooking,
  ReviewItem,
  PropertyReport,
  OwnerPropertyImage,
  AreaItem,
  AdminNotification,
  AdminActivityLog,
  SystemSetting,
} from './types';

import {
  supabase,
  fetchAllDataFromSupabase,
  updatePropertyVerification,
  toggleUserDisabledState,
  savePropertyToSupabase,
  deletePropertyFromSupabase,
  propVerified,
} from './lib/supabase';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewView } from './components/OverviewView';
import { AnalyticsView } from './components/AnalyticsView';
import { UserManagementView } from './components/UserManagementView';
import { PropertiesView } from './components/PropertiesView';
import { UnverifiedPropertiesView } from './components/UnverifiedPropertiesView';
import { PlatformControlViews } from './components/PlatformControlViews';
import { IntelligenceViews } from './components/IntelligenceViews';
import { PropertyPreviewModal } from './components/PropertyPreviewModal';
import { UserProfileModal } from './components/UserProfileModal';
import { OwnerEditModal } from './components/OwnerEditModal';
import { AdvancedPropertyModal } from './components/AdvancedPropertyModal';
import { Toast } from './components/Toast';
import { AuthScreen } from './components/AuthScreen';

export default function App() {
  // =========================================================
  // AUTHENTICATION
  // =========================================================

  const [isAuthenticated, setIsAuthenticated] =
    useState<boolean>(false);

  const [adminEmail, setAdminEmail] =
    useState<string>(
      'satpalswami22742@gmail.com'
    );

  // =========================================================
  // NAVIGATION
  // =========================================================

  const [currentTab, setCurrentTab] =
    useState<SectionTab>('overview');

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] =
    useState<boolean>(false);

  // =========================================================
  // SYSTEM STATE
  // =========================================================

  const [dbConnected, setDbConnected] =
    useState<boolean>(false);

  const [lastSync, setLastSync] =
    useState<string>('Not synced');

  const [isRefreshing, setIsRefreshing] =
    useState<boolean>(false);

  const [toast, setToast] = useState<{
    message: string;
    type?: 'success' | 'error' | 'info';
  } | null>(null);

  // =========================================================
  // REAL DATA STATE
  //
  // IMPORTANT:
  // No seed/demo/mock data.
  // Everything starts empty and is loaded from Supabase.
  // =========================================================

  const [properties, setProperties] =
    useState<PropertyItem[]>([]);

  const [students, setStudents] =
    useState<UserProfile[]>([]);

  const [owners, setOwners] =
    useState<UserProfile[]>([]);

  const [listingRequests, setListingRequests] =
    useState<ListingRequest[]>([]);

  const [claimRequests, setClaimRequests] =
    useState<ClaimRequest[]>([]);

  const [verificationRequests, setVerificationRequests] =
    useState<VerificationRequest[]>([]);

  const [bookings, setBookings] =
    useState<StudentBooking[]>([]);

  const [reviews, setReviews] =
    useState<ReviewItem[]>([]);

  const [reports, setReports] =
    useState<PropertyReport[]>([]);

  const [mediaImages, setMediaImages] =
    useState<OwnerPropertyImage[]>([]);

  const [areas, setAreas] =
    useState<AreaItem[]>([]);

  const [notifications, setNotifications] =
    useState<AdminNotification[]>([]);

  const [activityLogs, setActivityLogs] =
    useState<AdminActivityLog[]>([]);

  const [settings, setSettings] =
    useState<SystemSetting[]>([]);

  // =========================================================
  // MODALS
  // =========================================================

  const [previewProperty, setPreviewProperty] =
    useState<PropertyItem | null>(null);

  const [userProfileModal, setUserProfileModal] =
    useState<UserProfile | null>(null);

  const [ownerEditModal, setOwnerEditModal] =
    useState<UserProfile | null>(null);

  const [propertyEditor, setPropertyEditor] = useState<{
    isOpen: boolean;
    property: PropertyItem | null;
    type: PropertyType;
  }>({
    isOpen: false,
    property: null,
    type: 'hostels',
  });

  // =========================================================
  // TOAST
  // =========================================================

  const showToast = useCallback(
    (
      message: string,
      type: 'success' | 'error' | 'info' = 'success'
    ) => {
      setToast({
        message,
        type,
      });
    },
    []
  );

  // =========================================================
  // PROPERTY CATEGORY HELPER
  // =========================================================

  const getPropertyType = useCallback(
    (property: PropertyItem): PropertyType => {
      const raw = String(
        (property as any).property_type ||
          (property as any).type ||
          (property as any).category ||
          ''
      ).toLowerCase();

      if (
        raw.includes('tiffin') ||
        raw.includes('mess')
      ) {
        return 'tiffins';
      }

      if (raw.includes('library')) {
        return 'libraries';
      }

      if (raw.includes('cafe')) {
        return 'cafes';
      }

      if (
        raw.includes('book') ||
        raw.includes('bookstore')
      ) {
        return 'bookstores';
      }

      return 'hostels';
    },
    []
  );

  // =========================================================
  // LOAD / SYNC REAL SUPABASE DATA
  // =========================================================

  const loadData = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const fetched =
        await fetchAllDataFromSupabase();

      // IMPORTANT:
      // Always replace state.
      // Do NOT check .length.
      // If Supabase returns [], state must become [].

      setProperties(
        Array.isArray(fetched?.properties)
          ? fetched.properties
          : []
      );

      setStudents(
        Array.isArray(fetched?.students)
          ? fetched.students
          : []
      );

      setOwners(
        Array.isArray(fetched?.owners)
          ? fetched.owners
          : []
      );

      setListingRequests(
        Array.isArray(
          fetched?.listingRequests
        )
          ? fetched.listingRequests
          : []
      );

      setClaimRequests(
        Array.isArray(
          fetched?.claimRequests
        )
          ? fetched.claimRequests
          : []
      );

      setVerificationRequests(
        Array.isArray(
          fetched?.verificationRequests
        )
          ? fetched.verificationRequests
          : []
      );

      setBookings(
        Array.isArray(fetched?.bookings)
          ? fetched.bookings
          : []
      );

      setReviews(
        Array.isArray(fetched?.reviews)
          ? fetched.reviews
          : []
      );

      setReports(
        Array.isArray(fetched?.reports)
          ? fetched.reports
          : []
      );

      setMediaImages(
        Array.isArray(
          fetched?.mediaImages
        )
          ? fetched.mediaImages
          : []
      );

      setAreas(
        Array.isArray(fetched?.areas)
          ? fetched.areas
          : []
      );

      // No confirmed notifications table/source in the live schema. Never fabricate notifications.
      setNotifications([]);

      setActivityLogs(
        Array.isArray(
          fetched?.activityLogs
        )
          ? fetched.activityLogs
          : []
      );

      setSettings(
        Array.isArray(fetched?.settings)
          ? fetched.settings
          : []
      );

      setDbConnected(true);

      setLastSync(
        new Date().toLocaleTimeString()
      );
    } catch (err: any) {
      console.warn(
        'Supabase fetch notice:',
        err?.message || err
      );

      setDbConnected(false);

      // IMPORTANT:
      // On failed initial load, do not keep fake/stale data.
      setProperties([]);
      setStudents([]);
      setOwners([]);
      setListingRequests([]);
      setClaimRequests([]);
      setVerificationRequests([]);
      setBookings([]);
      setReviews([]);
      setReports([]);
      setMediaImages([]);
      setAreas([]);
      setNotifications([]);
      setActivityLogs([]);
      setSettings([]);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // =========================================================
  // INITIAL REAL DATA LOAD
  // =========================================================

  useEffect(() => {
    loadData();
  }, [loadData]);

  // =========================================================
  // ACTIVITY LOG
  // =========================================================

  const logActivity = useCallback(
    (
      action: string,
      entityType: string,
      entityId: string | number,
      detail: any
    ) => {
      const newLog: AdminActivityLog = {
        id: Date.now(),
        action,
        entity_type: entityType,
        entity_id: String(entityId),
        admin_email: adminEmail,
        new_value: detail,
        created_at:
          new Date().toISOString(),
      };

      setActivityLogs((prev) => [
        newLog,
        ...prev,
      ]);
    },
    [adminEmail]
  );

  // =========================================================
  // SIDEBAR BADGES
  // =========================================================

  const pendingListingCount = useMemo(
    () =>
      listingRequests.filter(
        (r) =>
          String(
            r.status || 'pending'
          ).toLowerCase() === 'pending'
      ).length,
    [listingRequests]
  );

  const pendingClaimCount = useMemo(
    () =>
      claimRequests.filter(
        (c) =>
          String(
            c.status || 'pending'
          ).toLowerCase() === 'pending'
      ).length,
    [claimRequests]
  );

  const unverifiedCount = useMemo(
    () =>
      properties.filter(
        (p) => !propVerified(p)
      ).length,
    [properties]
  );

  const pendingVerificationCount =
    useMemo(
      () =>
        verificationRequests.filter(
          (v) =>
            String(
              v.status || 'pending'
            ).toLowerCase() === 'pending'
        ).length,
      [verificationRequests]
    );

  const pendingBookingCount = useMemo(
    () =>
      bookings.filter(
        (b) =>
          String(
            b.status || 'active'
          ).toLowerCase() === 'pending'
      ).length,
    [bookings]
  );

  const pendingReviewCount = useMemo(
    () =>
      reviews.filter(
        (r) =>
          String(
            r.status || 'pending'
          ).toLowerCase() === 'pending'
      ).length,
    [reviews]
  );

  const pendingReportCount = useMemo(
    () =>
      reports.filter(
        (rp) =>
          String(
            rp.status || 'investigating'
          ).toLowerCase() !== 'resolved'
      ).length,
    [reports]
  );

  const unreadNotificationCount =
    useMemo(
      () =>
        notifications.filter(
          (n) =>
            String(
              n.status || 'unread'
            ).toLowerCase() === 'unread'
        ).length,
      [notifications]
    );

  // =========================================================
  // PROPERTY HANDLERS
  // =========================================================

  const handleOpenPropertyPreview = (
    property: PropertyItem
  ) => {
    setPreviewProperty(property);
  };

  const handleOpenPropertyEditor = (
    property: PropertyItem | null,
    type?: PropertyType
  ) => {
    setPropertyEditor({
      isOpen: true,
      property,
      type:
        type ||
        (property
          ? getPropertyType(property)
          : 'hostels'),
    });
  };

  const handleSaveProperty = async (
    saved: PropertyItem
  ) => {
    try {
      const result =
        await savePropertyToSupabase(
          saved
        );

      setProperties((prev) => {
        const idx = prev.findIndex(
          (p) =>
            String(p.id) ===
            String(result.id)
        );

        if (idx >= 0) {
          const copy = [...prev];

          copy[idx] = {
            ...copy[idx],
            ...result,
          };

          return copy;
        }

        return [
          result,
          ...prev,
        ];
      });

      logActivity(
        propertyEditor.property
          ? 'update_property'
          : 'create_property',
        'property',
        result.id,
        {
          name: result.name,
          area: result.area,
        }
      );

      showToast(
        `Property "${result.name}" saved successfully in Supabase.`
      );

      setPropertyEditor({
        isOpen: false,
        property: null,
        type: 'hostels',
      });
    } catch (err: any) {
      showToast(
        err?.message ||
          'Error saving property',
        'error'
      );
    }
  };

  const handleToggleVerification =
    async (
      property: PropertyItem,
      nextVerified: boolean
    ) => {
      try {
        await updatePropertyVerification(
          property.id,
          nextVerified,
          property.category
        );

        setProperties((prev) =>
          prev.map((p) =>
            String(p.id) ===
            String(property.id)
              ? {
                  ...p,
                  verified:
                    nextVerified,
                  is_verified:
                    nextVerified,
                }
              : p
          )
        );

        setPreviewProperty((prev) =>
          prev &&
          String(prev.id) ===
            String(property.id)
            ? {
                ...prev,
                verified:
                  nextVerified,
                is_verified:
                  nextVerified,
              }
            : prev
        );

        logActivity(
          'toggle_verification',
          'property',
          property.id,
          {
            verified:
              nextVerified,
          }
        );

        showToast(
          `Property "${property.name}" is now ${
            nextVerified
              ? 'Verified ★'
              : 'Unverified'
          }`
        );
      } catch (err: any) {
        showToast(
          err?.message ||
            'Error updating verification',
          'error'
        );
      }
    };

  const handleDeleteProperty =
    async (
      property: PropertyItem
    ) => {
      if (
        !window.confirm(
          `Are you sure you want to delete "${property.name}"? This action is permanent.`
        )
      ) {
        return;
      }

      try {
        await deletePropertyFromSupabase(
          property.id,
          property.category
        );

        setProperties((prev) =>
          prev.filter(
            (p) =>
              String(p.id) !==
              String(property.id)
          )
        );

        if (
          previewProperty &&
          String(previewProperty.id) ===
            String(property.id)
        ) {
          setPreviewProperty(null);
        }

        logActivity(
          'delete_property',
          'property',
          property.id,
          {
            name: property.name,
          }
        );

        showToast(
          `Property "${property.name}" deleted successfully.`
        );
      } catch (err: any) {
        showToast(
          err?.message ||
            'Error deleting property',
          'error'
        );
      }
    };

  // =========================================================
  // BULK PROPERTY ACTION
  //
  // NOTE:
  // This currently updates UI state only.
  // Do not pretend it is persisted until the Supabase
  // bulk mutation is wired in supabase.ts.
  // =========================================================

  const handleBulkAction = async (
    action:
      | 'verify'
      | 'activate'
      | 'suspend'
      | 'feature',
    selectedIds: string[]
  ) => {
    if (!selectedIds.length) {
      return;
    }

    showToast(
      `Bulk "${action}" selected. Individual Supabase updates should be used until bulk persistence is connected.`,
      'info'
    );
  };

  // =========================================================
  // USER HANDLERS
  // =========================================================

  const handleToggleUserStatus =
    async (
      userId: string,
      currentlyDisabled: boolean
    ) => {
      try {
        await toggleUserDisabledState(
          userId,
          !currentlyDisabled
        );

        const nextStatus =
          currentlyDisabled
            ? 'active'
            : 'disabled';

        setStudents((prev) =>
          prev.map((s) =>
            String(s.id) ===
            String(userId)
              ? {
                  ...s,
                  status: nextStatus,
                }
              : s
          )
        );

        setOwners((prev) =>
          prev.map((o) =>
            String(o.id) ===
            String(userId)
              ? {
                  ...o,
                  status: nextStatus,
                }
              : o
          )
        );

        logActivity(
          'toggle_user_status',
          'user',
          userId,
          {
            new_status:
              nextStatus,
          }
        );

        showToast(
          `User status updated to ${nextStatus}.`
        );
      } catch (err: any) {
        showToast(
          err?.message ||
            'Error updating user status',
          'error'
        );
      }
    };

  const handleDeleteUser = (
    userId: string
  ) => {
    if (
      !window.confirm(
        'Delete this user account? Associated permissions will be removed.'
      )
    ) {
      return;
    }

    // IMPORTANT:
    // No fake success message.
    // Supabase delete for profiles/auth is not wired
    // here because auth.users cannot be safely deleted
    // using the public anon client.

    showToast(
      'User deletion is not connected to Supabase yet.',
      'info'
    );
  };

  const handleSaveOwnerEdit = (
    updatedOwner: UserProfile
  ) => {
    // UI update only for now.
    // Supabase profile update needs to be explicitly
    // wired against the confirmed profiles schema.

    setOwners((prev) =>
      prev.map((o) =>
        String(o.id) ===
        String(updatedOwner.id)
          ? updatedOwner
          : o
      )
    );

    setProperties((prev) =>
      prev.map((p) => {
        if (
          p.owner_id &&
          String(p.owner_id) ===
            String(updatedOwner.id)
        ) {
          return {
            ...p,
            owner_name:
              updatedOwner.full_name ||
              p.owner_name,
            phone:
              updatedOwner.phone ||
              p.phone,
          };
        }

        return p;
      })
    );

    setOwnerEditModal(null);

    logActivity(
      'update_owner',
      'user',
      updatedOwner.id,
      {
        name:
          updatedOwner.full_name,
      }
    );

    showToast(
      `Owner profile updated in the current admin session.`
    );
  };

  // =========================================================
  // LISTING REQUESTS
  //
  // IMPORTANT:
  // No fake property is created here.
  // Approval must be connected to the real request row
  // and real category table before publishing.
  // =========================================================

  const handleApproveListing = async (
    id: string | number
  ) => {
    const req = listingRequests.find(
      (r) => String(r.id) === String(id)
    );

    if (!req) {
      showToast('Listing request not found.', 'error');
      return;
    }

    const rawCategory = String(
      req.category || req.property_type || ''
    ).trim().toLowerCase().replace(/[\s_-]+/g, '');

    const table = rawCategory.includes('book') || rawCategory.includes('stationery')
      ? 'bookstores'
      : rawCategory.includes('cafe')
      ? 'cafes'
      : rawCategory.includes('library')
      ? 'libraries'
      : rawCategory.includes('tiffin') || rawCategory.includes('mess')
      ? 'tiffins'
      : 'hostels';

    if (!req.name || !req.area || !req.address || !req.phone) {
      showToast(
        'This request is missing required listing data (name, area, address or phone). It was not published.',
        'error'
      );
      return;
    }

    try {
      const listingPayload: Record<string, any> = {
        id: req.id,
        name: req.name,
        category: table === 'bookstores' ? 'bookstore' : table === 'cafes' ? 'cafe' : table === 'libraries' ? 'library' : table === 'tiffins' ? 'tiffin' : 'hostel',
        area: req.area,
        address: req.address,
        phone: req.phone,
        timing: req.timing ?? null,
        facilities: req.facilities ?? null,
        rating: req.rating ?? null,
        owner_id: req.owner_id ?? null,
        owner_name: req.owner_name ?? null,
        image: req.image ?? null,
        verified: false,
        status: 'active',
        property_id: req.id,
        created_at: req.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (table === 'bookstores') {
        listingPayload.whatsapp = req.owner_phone ?? req.phone;
      }

      const { error: publishError } = await supabase
        .from(table)
        .upsert(listingPayload, { onConflict: 'id' });

      if (publishError) throw publishError;

      const { error: approvalError } = await supabase
        .from('listing_requests')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', req.id)
        .eq('status', 'pending');

      if (approvalError) throw approvalError;

      setListingRequests((prev) =>
        prev.map((r) =>
          String(r.id) === String(id)
            ? { ...r, status: 'approved', updated_at: new Date().toISOString() }
            : r
        )
      );

      await loadData();

      logActivity(
        'approve_listing',
        'listing_request',
        id,
        { table, property_id: req.id, name: req.name }
      );

      showToast(`Listing "${req.name}" approved and published in ${table}.`);
    } catch (err: any) {
      console.error('Listing approval failed:', err);
      showToast(
        err?.message || 'Listing approval failed. Nothing was marked approved.',
        'error'
      );
    }
  };

  const handleRejectListing = (
    id: string | number
  ) => {
    setListingRequests((prev) =>
      prev.map((r) =>
        String(r.id) ===
        String(id)
          ? {
              ...r,
              status: 'rejected',
            }
          : r
      )
    );

    logActivity(
      'reject_listing',
      'listing_request',
      id,
      {}
    );

    showToast(
      'Listing request marked as rejected in the current admin session.'
    );
  };

  // =========================================================
  // CLAIM REQUESTS
  // =========================================================

  const handleApproveClaim = (
    id: string | number
  ) => {
    setClaimRequests((prev) =>
      prev.map((c) =>
        String(c.id) ===
        String(id)
          ? {
              ...c,
              status: 'approved',
            }
          : c
      )
    );

    logActivity(
      'approve_claim',
      'claim_request',
      id,
      {}
    );

    showToast(
      'Ownership claim marked approved in the current admin session.'
    );
  };

  const handleRejectClaim = (
    id: string | number
  ) => {
    setClaimRequests((prev) =>
      prev.map((c) =>
        String(c.id) ===
        String(id)
          ? {
              ...c,
              status: 'rejected',
            }
          : c
      )
    );

    logActivity(
      'reject_claim',
      'claim_request',
      id,
      {}
    );

    showToast(
      'Ownership claim marked rejected in the current admin session.'
    );
  };

  // =========================================================
  // VERIFICATION REQUESTS
  // =========================================================

  const handleApproveVerification = (
    id: string | number
  ) => {
    const v =
      verificationRequests.find(
        (item) =>
          String(item.id) ===
          String(id)
      );

    if (
      v &&
      v.property_id
    ) {
      const property =
        properties.find(
          (p) =>
            String(p.id) ===
            String(v.property_id)
        );

      if (property) {
        handleToggleVerification(
          property,
          true
        );
      }
    }

    setVerificationRequests(
      (prev) =>
        prev.map((req) =>
          String(req.id) ===
          String(id)
            ? {
                ...req,
                status: 'approved',
              }
            : req
        )
    );

    logActivity(
      'approve_verification',
      'verification_request',
      id,
      {}
    );

    showToast(
      'Verification request processed.'
    );
  };

  const handleRejectVerification = (
    id: string | number
  ) => {
    setVerificationRequests(
      (prev) =>
        prev.map((req) =>
          String(req.id) ===
          String(id)
            ? {
                ...req,
                status: 'rejected',
              }
            : req
        )
    );

    logActivity(
      'reject_verification',
      'verification_request',
      id,
      {}
    );

    showToast(
      'Verification request marked rejected.'
    );
  };

  // =========================================================
  // BOOKINGS
  // =========================================================

  const handleToggleBookingStatus = (
    id: string | number,
    nextStatus: string
  ) => {
    setBookings((prev) =>
      prev.map((b) =>
        String(b.id) ===
        String(id)
          ? {
              ...b,
              status: nextStatus,
            }
          : b
      )
    );

    logActivity(
      'update_booking_status',
      'booking',
      id,
      {
        status: nextStatus,
      }
    );

    showToast(
      `Booking #${id} status changed to ${nextStatus}.`
    );
  };

  // =========================================================
  // REVIEWS
  // =========================================================

  const handleToggleReviewStatus = (
    id: string | number,
    nextStatus: string
  ) => {
    setReviews((prev) =>
      prev.map((r) =>
        String(r.id) ===
        String(id)
          ? {
              ...r,
              status: nextStatus,
            }
          : r
      )
    );

    logActivity(
      'update_review_status',
      'review',
      id,
      {
        status: nextStatus,
      }
    );

    showToast(
      `Review #${id} status changed to ${nextStatus}.`
    );
  };

  // =========================================================
  // REPORTS
  // =========================================================

  const handleResolveReport = (
    id: string | number,
    nextStatus: string
  ) => {
    setReports((prev) =>
      prev.map((rp) =>
        String(rp.id) ===
        String(id)
          ? {
              ...rp,
              status: nextStatus,
            }
          : rp
      )
    );

    logActivity(
      'resolve_report',
      'report',
      id,
      {
        status: nextStatus,
      }
    );

    showToast(
      `Report #${id} status changed to ${nextStatus}.`
    );
  };

  // =========================================================
  // FEATURED
  // =========================================================

  const handleUnfeatureProperty = (
    property: PropertyItem
  ) => {
    setProperties((prev) =>
      prev.map((p) =>
        String(p.id) ===
        String(property.id)
          ? {
              ...p,
              featured: false,
              is_featured: false,
            }
          : p
      )
    );

    logActivity(
      'remove_feature',
      'property',
      property.id,
      {}
    );

    showToast(
      `Removed "${property.name}" from featured listings in the current admin session.`
    );
  };

  // =========================================================
  // MEDIA
  // =========================================================

  const handleUploadMedia = async (
    propertyId: string,
    file: File,
    category: string
  ) => {
    // Object URL is browser-local only.
    // It must not be presented as a real uploaded Supabase URL.

    const localUrl =
      URL.createObjectURL(file);

    const newMedia: OwnerPropertyImage = {
      id: Date.now(),
      property_id: propertyId,
      url: localUrl,
      public_url: localUrl,
      category,
      created_at:
        new Date().toISOString(),
    };

    setMediaImages((prev) => [
      newMedia,
      ...prev,
    ]);

    logActivity(
      'upload_media',
      'media',
      newMedia.id,
      {
        property_id:
          propertyId,
        category,
      }
    );

    showToast(
      'Image preview added locally. Supabase Storage upload is not connected yet.',
      'info'
    );
  };

  const handleDeleteMedia = (
    id: string | number
  ) => {
    setMediaImages((prev) =>
      prev.filter(
        (m) =>
          String(m.id) !==
          String(id)
      )
    );

    logActivity(
      'delete_media',
      'media',
      id,
      {}
    );

    showToast(
      'Media removed from the current admin session.'
    );
  };

  // =========================================================
  // AREAS
  // =========================================================

  const handleAddArea = async (
    name: string,
    city: string
  ) => {
    const newArea: AreaItem = {
      id: Date.now(),
      name,
      area_name: name,
      city,
      state: 'Rajasthan',
      status: 'active',
      created_at:
        new Date().toISOString(),
    };

    setAreas((prev) => [
      ...prev,
      newArea,
    ]);

    logActivity(
      'add_area',
      'area',
      newArea.id,
      {
        name,
        city,
      }
    );

    showToast(
      `Area "${name}" added in the current admin session.`
    );
  };

  const handleEditArea = async (
    id: string | number,
    name: string
  ) => {
    setAreas((prev) =>
      prev.map((a) =>
        String(a.id) ===
        String(id)
          ? {
              ...a,
              name,
              area_name: name,
            }
          : a
      )
    );

    logActivity(
      'edit_area',
      'area',
      id,
      {
        name,
      }
    );

    showToast(
      `Area updated to "${name}" in the current admin session.`
    );
  };

  // =========================================================
  // NOTIFICATIONS
  // =========================================================

  const handleMarkNotificationRead = (_id: string | number) => {
    // Notifications are intentionally empty until a real Supabase notification source exists.
  };

  const handleMarkAllNotificationsRead = () => {
    // Nothing to mark: no fabricated notification records are created.
  };

  // =========================================================
  // SETTINGS
  // =========================================================

  const handleUpdateSetting = async (
    key: string,
    value: string
  ) => {
    setSettings((prev) =>
      prev.map((s) =>
        s.key === key ||
        s.setting_key === key
          ? {
              ...s,
              value,
            }
          : s
      )
    );

    logActivity(
      'update_setting',
      'setting',
      key,
      {
        value,
      }
    );

    showToast(
      `Setting "${key}" updated in the current admin session.`
    );
  };

  // =========================================================
  // PASSWORD
  // =========================================================

  const handleUpdatePassword = async (
    newPass: string
  ) => {
    if (!supabase) {
      throw new Error(
        'Supabase client is not available.'
      );
    }

    const {
      error,
    } =
      await supabase.auth.updateUser({
        password: newPass,
      });

    if (error) {
      throw error;
    }

    logActivity(
      'update_password',
      'auth',
      adminEmail,
      {}
    );
  };

  // =========================================================
  // AUTH SCREEN
  // =========================================================

  if (!isAuthenticated) {
    return (
      <AuthScreen
        onLoginSuccess={(email) => {
          setAdminEmail(email);
          setIsAuthenticated(true);

          showToast(
            `Welcome Director ${email}! Authenticated.`
          );
        }}
      />
    );
  }

  // =========================================================
  // MAIN DASHBOARD
  // =========================================================

  return (
    <div className="min-h-screen bg-[#050b1a] text-slate-100 flex overflow-hidden font-sans antialiased selection:bg-amber-400 selection:text-slate-950">

      {/* TOAST */}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() =>
            setToast(null)
          }
        />
      )}

      {/* SIDEBAR */}

      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setIsMobileSidebarOpen(false);
        }}
        badges={{
          listingRequests:
            pendingListingCount,

          claimRequests:
            pendingClaimCount,

          unverifiedProperties:
            unverifiedCount,

          verificationRequests:
            pendingVerificationCount,

          bookings:
            pendingBookingCount,

          reviews:
            pendingReviewCount,

          reports:
            pendingReportCount,
        }}
        onLogout={() => {
          setIsAuthenticated(false);
        }}
        isOpenMobile={
          isMobileSidebarOpen
        }
        onCloseMobile={() =>
          setIsMobileSidebarOpen(false)
        }
      />

      {/* MAIN WORKSPACE */}

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto bg-gradient-to-b from-[#060e22] via-[#050b1a] to-[#040814]">

        {/* HEADER */}

        <Header
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onRefresh={loadData}
          isRefreshing={isRefreshing}
          unreadNotifications={
            unreadNotificationCount
          }
          properties={properties}
          students={students}
          owners={owners}
          listingRequests={
            listingRequests
          }
          onOpenPropertyPreview={
            handleOpenPropertyPreview
          }
          onOpenUserProfile={(user) =>
            setUserProfileModal(user)
          }
          onToggleMobileSidebar={() =>
            setIsMobileSidebarOpen(
              (prev) => !prev
            )
          }
        />

        {/* CONTENT */}

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto pb-20">

          {/* OVERVIEW */}

          {currentTab === 'overview' && (
            <OverviewView
              onSelectTab={
                setCurrentTab
              }
              properties={
                properties
              }
              students={
                students
              }
              owners={
                owners
              }
              listingRequests={
                listingRequests
              }
              claimRequests={
                claimRequests
              }
              verificationRequests={
                verificationRequests
              }
              bookings={
                bookings
              }
              reviews={
                reviews
              }
              reports={
                reports
              }
              dbConnected={
                dbConnected
              }
              adminEmail={
                adminEmail
              }
              lastSync={
                lastSync
              }
              onOpenPropertyPreview={
                handleOpenPropertyPreview
              }
            />
          )}

          {/* ANALYTICS */}

          {currentTab === 'analytics' && (
            <AnalyticsView
              properties={
                properties
              }
              students={
                students
              }
              owners={
                owners
              }
              bookings={
                bookings
              }
              reviews={
                reviews
              }
            />
          )}

          {/* USER MANAGEMENT */}

          {(
            currentTab ===
              'user-management' ||
            currentTab ===
              'students' ||
            currentTab ===
              'owners'
          ) && (
            <UserManagementView
              students={
                students
              }
              owners={
                owners
              }
              properties={
                properties
              }
              bookings={
                bookings
              }
              reviews={
                reviews
              }
              onOpenUserProfile={(
                user
              ) =>
                setUserProfileModal(
                  user
                )
              }
              onEditOwner={(owner) =>
                setOwnerEditModal(
                  owner
                )
              }
              onToggleStatus={
                handleToggleUserStatus
              }
              onDeleteUser={
                handleDeleteUser
              }
              onAddPropertyForOwner={(
                owner
              ) => {
                setPropertyEditor({
                  isOpen: true,
                  property: {
                    id: '',
                    name: '',
                    owner_name:
                      owner.full_name,
                    phone:
                      owner.phone,
                    category:
                      'Hostel',
                    city: '',
                    status:
                      'active',
                    verified:
                      false,
                    created_at:
                      new Date().toISOString(),
                  },
                  type: 'hostels',
                });
              }}
            />
          )}

          {/* ALL PROPERTIES */}

          {currentTab ===
            'properties' && (
            <PropertiesView
              categoryFilter="all"
              properties={
                properties
              }
              onOpenPreview={
                handleOpenPropertyPreview
              }
              onOpenEditor={
                handleOpenPropertyEditor
              }
              onToggleVerification={
                handleToggleVerification
              }
              onDeleteProperty={
                handleDeleteProperty
              }
              onBulkAction={
                handleBulkAction
              }
            />
          )}

          {/* HOSTELS */}

          {currentTab ===
            'hostels' && (
            <PropertiesView
              categoryFilter="hostels"
              properties={
                properties
              }
              onOpenPreview={
                handleOpenPropertyPreview
              }
              onOpenEditor={
                handleOpenPropertyEditor
              }
              onToggleVerification={
                handleToggleVerification
              }
              onDeleteProperty={
                handleDeleteProperty
              }
              onBulkAction={
                handleBulkAction
              }
            />
          )}

          {/* TIFFINS */}

          {currentTab ===
            'tiffins' && (
            <PropertiesView
              categoryFilter="tiffins"
              properties={
                properties
              }
              onOpenPreview={
                handleOpenPropertyPreview
              }
              onOpenEditor={
                handleOpenPropertyEditor
              }
              onToggleVerification={
                handleToggleVerification
              }
              onDeleteProperty={
                handleDeleteProperty
              }
              onBulkAction={
                handleBulkAction
              }
            />
          )}

          {/* LIBRARIES */}

          {currentTab ===
            'libraries' && (
            <PropertiesView
              categoryFilter="libraries"
              properties={
                properties
              }
              onOpenPreview={
                handleOpenPropertyPreview
              }
              onOpenEditor={
                handleOpenPropertyEditor
              }
              onToggleVerification={
                handleToggleVerification
              }
              onDeleteProperty={
                handleDeleteProperty
              }
              onBulkAction={
                handleBulkAction
              }
            />
          )}

          {/* CAFES */}

          {currentTab ===
            'cafes' && (
            <PropertiesView
              categoryFilter="cafes"
              properties={
                properties
              }
              onOpenPreview={
                handleOpenPropertyPreview
              }
              onOpenEditor={
                handleOpenPropertyEditor
              }
              onToggleVerification={
                handleToggleVerification
              }
              onDeleteProperty={
                handleDeleteProperty
              }
              onBulkAction={
                handleBulkAction
              }
            />
          )}

          {/* BOOKSTORES */}

          {currentTab ===
            'bookstores' && (
            <PropertiesView
              categoryFilter="bookstores"
              properties={
                properties
              }
              onOpenPreview={
                handleOpenPropertyPreview
              }
              onOpenEditor={
                handleOpenPropertyEditor
              }
              onToggleVerification={
                handleToggleVerification
              }
              onDeleteProperty={
                handleDeleteProperty
              }
              onBulkAction={
                handleBulkAction
              }
            />
          )}

          {/* UNVERIFIED */}

          {currentTab ===
            'unverified-properties' && (
            <UnverifiedPropertiesView
              properties={
                properties
              }
              onOpenPreview={
                handleOpenPropertyPreview
              }
              onVerifyProperty={(
                property
              ) =>
                handleToggleVerification(
                  property,
                  true
                )
              }
              onRefresh={
                loadData
              }
              isRefreshing={
                isRefreshing
              }
            />
          )}

          {/* PLATFORM CONTROLS */}

          {[
            'listing-requests',
            'claim-requests',
            'verification',
            'bookings',
            'reviews',
            'reports',
            'media',
            'featured',
          ].includes(
            currentTab
          ) && (
            <PlatformControlViews
              currentSubTab={
                currentTab as any
              }
              listingRequests={
                listingRequests
              }
              claimRequests={
                claimRequests
              }
              verificationRequests={
                verificationRequests
              }
              bookings={
                bookings
              }
              reviews={
                reviews
              }
              reports={
                reports
              }
              mediaImages={
                mediaImages
              }
              properties={
                properties
              }
              onApproveListing={
                handleApproveListing
              }
              onRejectListing={
                handleRejectListing
              }
              onApproveClaim={
                handleApproveClaim
              }
              onRejectClaim={
                handleRejectClaim
              }
              onApproveVerification={
                handleApproveVerification
              }
              onRejectVerification={
                handleRejectVerification
              }
              onToggleBookingStatus={
                handleToggleBookingStatus
              }
              onToggleReviewStatus={
                handleToggleReviewStatus
              }
              onResolveReport={
                handleResolveReport
              }
              onUnfeatureProperty={
                handleUnfeatureProperty
              }
              onUploadMedia={
                handleUploadMedia
              }
              onDeleteMedia={
                handleDeleteMedia
              }
              onPreviewProperty={
                handleOpenPropertyPreview
              }
            />
          )}

          {/* INTELLIGENCE / GOVERNANCE */}

          {[
            'areas',
            'notifications',
            'activity',
            'settings',
            'categories',
            'admin',
          ].includes(
            currentTab
          ) && (
            <IntelligenceViews
              currentSubTab={
                currentTab as any
              }
              areas={
                areas
              }
              notifications={
                notifications
              }
              activityLogs={
                activityLogs
              }
              settings={
                settings
              }
              properties={
                properties
              }
              onAddArea={
                handleAddArea
              }
              onEditArea={
                handleEditArea
              }
              onMarkNotificationRead={
                handleMarkNotificationRead
              }
              onMarkAllNotificationsRead={
                handleMarkAllNotificationsRead
              }
              onUpdateSetting={
                handleUpdateSetting
              }
              onUpdatePassword={
                handleUpdatePassword
              }
            />
          )}
        </main>
      </div>

      {/* =====================================================
          PROPERTY PREVIEW
      ====================================================== */}

      {previewProperty && (
        <PropertyPreviewModal
          property={
            previewProperty
          }
          propertyType={getPropertyType(previewProperty)}
          onClose={() =>
            setPreviewProperty(
              null
            )
          }
          onEdit={(p) => {
            setPreviewProperty(
              null
            );

            handleOpenPropertyEditor(
              p,
              getPropertyType(p)
            );
          }}
          onToggleVerification={(
            p,
            next
          ) =>
            handleToggleVerification(
              p,
              next
            )
          }
          onDelete={(p) =>
            handleDeleteProperty(
              p
            )
          }
        />
      )}

      {/* =====================================================
          USER PROFILE
      ====================================================== */}

      {userProfileModal && (
        <UserProfileModal
          user={
            userProfileModal
          }
          properties={
            properties
          }
          bookings={
            bookings
          }
          reviews={
            reviews
          }
          onClose={() =>
            setUserProfileModal(
              null
            )
          }
          onToggleStatus={(
            id,
            curDisabled
          ) =>
            handleToggleUserStatus(
              id,
              curDisabled
            )
          }
          onDeleteUser={
            handleDeleteUser
          }
          onViewProperty={(
            property
          ) => {
            setUserProfileModal(
              null
            );

            handleOpenPropertyPreview(
              property
            );
          }}
        />
      )}

      {/* =====================================================
          OWNER EDIT
      ====================================================== */}

      {ownerEditModal && (
        <OwnerEditModal
          owner={
            ownerEditModal
          }
          onClose={() =>
            setOwnerEditModal(
              null
            )
          }
          onSave={
            handleSaveOwnerEdit
          }
        />
      )}

      {/* =====================================================
          ADVANCED PROPERTY EDITOR
      ====================================================== */}

      {propertyEditor.isOpen && (
        <AdvancedPropertyModal
          property={
            propertyEditor.property
          }
          initialType={
            propertyEditor.type
          }
          onClose={() =>
            setPropertyEditor({
              isOpen: false,
              property: null,
              type: 'hostels',
            })
          }
          onSave={
            handleSaveProperty
          }
        />
      )}
    </div>
  );
}
