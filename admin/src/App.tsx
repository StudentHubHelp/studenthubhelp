import React, { useState, useEffect, useCallback, useMemo } from 'react';

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
  initialSeedData,
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

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [adminEmail, setAdminEmail] = useState<string>(
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
    useState<boolean>(true);

  const [lastSync, setLastSync] =
    useState<string>('Just now');

  const [isRefreshing, setIsRefreshing] =
    useState<boolean>(false);

  const [toast, setToast] = useState<{
    message: string;
    type?: 'success' | 'error' | 'info';
  } | null>(null);

  // =========================================================
  // DATA STATE
  // =========================================================

  const [properties, setProperties] =
    useState<PropertyItem[]>(
      initialSeedData.properties
    );

  const [students, setStudents] =
    useState<UserProfile[]>(
      initialSeedData.students
    );

  const [owners, setOwners] =
    useState<UserProfile[]>(
      initialSeedData.owners
    );

  const [listingRequests, setListingRequests] =
    useState<ListingRequest[]>(
      initialSeedData.listingRequests
    );

  const [claimRequests, setClaimRequests] =
    useState<ClaimRequest[]>(
      initialSeedData.claimRequests
    );

  const [verificationRequests, setVerificationRequests] =
    useState<VerificationRequest[]>(
      initialSeedData.verificationRequests
    );

  const [bookings, setBookings] =
    useState<StudentBooking[]>(
      initialSeedData.bookings
    );

  const [reviews, setReviews] =
    useState<ReviewItem[]>(
      initialSeedData.reviews
    );

  const [reports, setReports] =
    useState<PropertyReport[]>(
      initialSeedData.reports
    );

  const [mediaImages, setMediaImages] =
    useState<OwnerPropertyImage[]>(
      initialSeedData.mediaImages
    );

  const [areas, setAreas] =
    useState<AreaItem[]>(
      initialSeedData.areas
    );

  const [notifications, setNotifications] =
    useState<AdminNotification[]>(
      initialSeedData.notifications
    );

  const [activityLogs, setActivityLogs] =
    useState<AdminActivityLog[]>(
      initialSeedData.activityLogs
    );

  const [settings, setSettings] =
    useState<SystemSetting[]>(
      initialSeedData.settings
    );

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
  // LOAD / SYNC DATA
  // =========================================================

  const loadData = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const fetched =
        await fetchAllDataFromSupabase();

      if (fetched?.properties?.length) {
        setProperties(fetched.properties);
      }

      if (fetched?.students?.length) {
        setStudents(fetched.students);
      }

      if (fetched?.owners?.length) {
        setOwners(fetched.owners);
      }

      if (fetched?.listingRequests?.length) {
        setListingRequests(
          fetched.listingRequests
        );
      }

      if (fetched?.claimRequests?.length) {
        setClaimRequests(
          fetched.claimRequests
        );
      }

      if (fetched?.verificationRequests?.length) {
        setVerificationRequests(
          fetched.verificationRequests
        );
      }

      if (fetched?.bookings?.length) {
        setBookings(fetched.bookings);
      }

      if (fetched?.reviews?.length) {
        setReviews(fetched.reviews);
      }

      if (fetched?.reports?.length) {
        setReports(fetched.reports);
      }

      if (fetched?.mediaImages?.length) {
        setMediaImages(
          fetched.mediaImages
        );
      }

      if (fetched?.areas?.length) {
        setAreas(fetched.areas);
      }

      if (fetched?.notifications?.length) {
        setNotifications(
          fetched.notifications
        );
      }

      if (fetched?.activityLogs?.length) {
        setActivityLogs(
          fetched.activityLogs
        );
      }

      if (fetched?.settings?.length) {
        setSettings(fetched.settings);
      }

      setDbConnected(true);
      setLastSync(
        new Date().toLocaleTimeString()
      );
    } catch (err: any) {
      console.warn(
        'Supabase fetch notice:',
        err?.message
      );

      setDbConnected(false);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

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
        created_at: new Date().toISOString(),
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
          (r.status || 'pending')
            .toLowerCase() === 'pending'
      ).length,
    [listingRequests]
  );

  const pendingClaimCount = useMemo(
    () =>
      claimRequests.filter(
        (c) =>
          (c.status || 'pending')
            .toLowerCase() === 'pending'
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

  const pendingVerificationCount = useMemo(
    () =>
      verificationRequests.filter(
        (v) =>
          (v.status || 'pending')
            .toLowerCase() === 'pending'
      ).length,
    [verificationRequests]
  );

  const pendingBookingCount = useMemo(
    () =>
      bookings.filter(
        (b) =>
          (b.status || 'active')
            .toLowerCase() === 'pending'
      ).length,
    [bookings]
  );

  const pendingReviewCount = useMemo(
    () =>
      reviews.filter(
        (r) =>
          (r.status || 'pending')
            .toLowerCase() === 'pending'
      ).length,
    [reviews]
  );

  const pendingReportCount = useMemo(
    () =>
      reports.filter(
        (rp) =>
          (rp.status || 'investigating')
            .toLowerCase() !== 'resolved'
      ).length,
    [reports]
  );

  const unreadNotificationCount = useMemo(
    () =>
      notifications.filter(
        (n) =>
          (n.status || 'unread')
            .toLowerCase() === 'unread'
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
    type: PropertyType = 'hostels'
  ) => {
    setPropertyEditor({
      isOpen: true,
      property,
      type,
    });
  };

  const handleSaveProperty = async (
    saved: PropertyItem
  ) => {
    try {
      const result =
        await savePropertyToSupabase(saved);

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
        `Property "${result.name}" saved successfully in directory!`
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

        if (
          previewProperty &&
          String(previewProperty.id) ===
            String(property.id)
        ) {
          setPreviewProperty(
            (prev) =>
              prev
                ? {
                    ...prev,
                    verified:
                      nextVerified,
                    is_verified:
                      nextVerified,
                  }
                : null
          );
        }

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

    setProperties((prev) =>
      prev.map((p) => {
        if (
          !selectedIds.includes(
            String(p.id)
          )
        ) {
          return p;
        }

        if (action === 'verify') {
          return {
            ...p,
            verified: true,
            is_verified: true,
          };
        }

        if (action === 'activate') {
          return {
            ...p,
            status: 'active',
          };
        }

        if (action === 'suspend') {
          return {
            ...p,
            status: 'suspended',
          };
        }

        if (action === 'feature') {
          return {
            ...p,
            featured: true,
            is_featured: true,
          };
        }

        return p;
      })
    );

    logActivity(
      `bulk_${action}`,
      'properties',
      selectedIds.join(','),
      {
        count: selectedIds.length,
      }
    );

    showToast(
      `Bulk action "${action}" applied to ${selectedIds.length} properties.`
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

    setStudents((prev) =>
      prev.filter(
        (s) =>
          String(s.id) !==
          String(userId)
      )
    );

    setOwners((prev) =>
      prev.filter(
        (o) =>
          String(o.id) !==
          String(userId)
      )
    );

    logActivity(
      'delete_user',
      'user',
      userId,
      {}
    );

    showToast(
      'User profile removed.'
    );
  };

  const handleSaveOwnerEdit = (
    updatedOwner: UserProfile
  ) => {
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
      `Owner profile for ${updatedOwner.full_name} updated successfully.`
    );
  };

  // =========================================================
  // LISTING REQUESTS
  // =========================================================

  const handleApproveListing = (
    id: string | number
  ) => {
    const req =
      listingRequests.find(
        (r) =>
          String(r.id) ===
          String(id)
      );

    if (!req) {
      return;
    }

    const newProperty: PropertyItem = {
      id: `prop-live-${Date.now()}`,
      name:
        req.name ||
        req.property_name ||
        'Approved Accommodation',
      category:
        req.category ||
        req.property_type ||
        'Hostel',
      area:
        req.area ||
        'Kota',
      address:
        req.address ||
        'Landmark Road, Kota',
      city: 'Kota',
      owner_name:
        req.owner_name ||
        'Direct Owner',
      phone:
        req.phone ||
        '',
      price:
        req.price ||
        '₹6,500/mo',
      status: 'active',
      verified: true,
      featured: false,
      rating: 4.8,
      views_count: 1,
      booking_count: 0,
      created_at:
        new Date().toISOString(),
    };

    setProperties((prev) => [
      newProperty,
      ...prev,
    ]);

    setListingRequests((prev) =>
      prev.map((r) =>
        String(r.id) ===
        String(id)
          ? {
              ...r,
              status: 'approved',
            }
          : r
      )
    );

    logActivity(
      'approve_listing',
      'listing_request',
      id,
      {
        property_name:
          newProperty.name,
      }
    );

    showToast(
      `Listing "${newProperty.name}" approved & published live!`
    );
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
      'Listing request marked as rejected.'
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
      'Ownership claim approved.'
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
      'Ownership claim rejected.'
    );
  };

  // =========================================================
  // VERIFICATION
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
      setProperties((prev) =>
        prev.map((p) =>
          String(p.id) ===
          String(v.property_id)
            ? {
                ...p,
                verified: true,
                is_verified: true,
              }
            : p
        )
      );
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
      'Verification request approved. Badge issued.'
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
      'Verification request rejected.'
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
      `Report #${id} resolved.`
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
      `Removed "${property.name}" from featured listings.`
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
    const mockUrl =
      URL.createObjectURL(file);

    const newMedia: OwnerPropertyImage = {
      id: Date.now(),
      property_id: propertyId,
      url: mockUrl,
      public_url: mockUrl,
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
      'Media image deleted.'
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
      `Area "${name}" added.`
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
      `Area updated to "${name}".`
    );
  };

  // =========================================================
  // NOTIFICATIONS
  // =========================================================

  const handleMarkNotificationRead = (
    id: string | number
  ) => {
    setNotifications((prev) =>
      prev.map((n) =>
        String(n.id) ===
        String(id)
          ? {
              ...n,
              status: 'read',
            }
          : n
      )
    );
  };

  const handleMarkAllNotificationsRead =
    () => {
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          status: 'read',
        }))
      );

      showToast(
        'All notifications marked as read.'
      );
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
      `Setting "${key}" updated.`
    );
  };

  // =========================================================
  // PASSWORD
  // =========================================================

  const handleUpdatePassword = async (
    newPass: string
  ) => {
    if (supabase) {
      const {
        error,
      } =
        await supabase.auth.updateUser({
          password: newPass,
        });

      if (error) {
        throw error;
      }
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

      {/* =====================================================
          TOAST
      ====================================================== */}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() =>
            setToast(null)
          }
        />
      )}

      {/* =====================================================
          SIDEBAR
          
          IMPORTANT:
          Sidebar.tsx expects "badges", not "counts".
      ====================================================== */}

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

      {/* =====================================================
          MAIN WORKSPACE
      ====================================================== */}

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto bg-gradient-to-b from-[#060e22] via-[#050b1a] to-[#040814]">

        {/* ===================================================
            HEADER

            Header.tsx expects its own search/data props.
        ==================================================== */}

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

        {/* ===================================================
            CONTENT
        ==================================================== */}

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto pb-20">

          {/* =================================================
              1. OVERVIEW
          ================================================== */}

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

          {/* =================================================
              2. ANALYTICS
          ================================================== */}

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

          {/* =================================================
              3. USER MANAGEMENT
          ================================================== */}

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
                    name: `${owner.full_name}'s Accommodation`,
                    owner_name:
                      owner.full_name,
                    phone:
                      owner.phone,
                    category:
                      'Hostel',
                    city: 'Kota',
                    status:
                      'active',
                    verified:
                      true,
                    created_at:
                      new Date().toISOString(),
                  },
                  type: 'hostels',
                });
              }}
            />
          )}

          {/* =================================================
              4. ALL PROPERTIES
          ================================================== */}

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

          {/* =================================================
              5. HOSTELS
          ================================================== */}

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

          {/* =================================================
              6. TIFFINS
          ================================================== */}

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

          {/* =================================================
              7. LIBRARIES
          ================================================== */}

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

          {/* =================================================
              8. CAFES
          ================================================== */}

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

          {/* =================================================
              9. BOOKSTORES
          ================================================== */}

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

          {/* =================================================
              10. UNVERIFIED
          ================================================== */}

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

          {/* =================================================
              11. PLATFORM CONTROLS
          ================================================== */}

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

          {/* =================================================
              12. INTELLIGENCE / GOVERNANCE
          ================================================== */}

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
          MODALS
      ====================================================== */}

      {/* PROPERTY PREVIEW */}

      {previewProperty && (
        <PropertyPreviewModal
          property={
            previewProperty
          }
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
              'hostels'
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

      {/* USER PROFILE */}

      {userProfileModal && (
        <UserProfileModal
          user={
            userProfileModal
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
        />
      )}

      {/* OWNER EDIT */}

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

      {/* ADVANCED PROPERTY EDITOR */}

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
