import AccessControl "authorization/access-control";
import Principal "mo:base/Principal";
import OrderedMap "mo:base/OrderedMap";
import Time "mo:base/Time";
import Debug "mo:base/Debug";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import Text "mo:base/Text";

actor AutoShout {
  // Initialize the user system state
  let accessControlState = AccessControl.initState();

  // Initialize auth (first caller becomes admin, others become users)
  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    // Admin-only check happens inside assignRole
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  public type UserProfile = {
    name : Text;
    farcasterHandle : Text;
    isPremium : Bool;
    createdAt : Time.Time;
  };

  transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);
  var userProfiles = principalMap.empty<UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view profiles");
    };
    principalMap.get(userProfiles, caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Can only view your own profile");
    };
    principalMap.get(userProfiles, user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles := principalMap.put(userProfiles, caller, profile);
  };

  // Storage for media files
  let storage = Storage.new();
  include MixinStorage(storage);

  public type ScheduledPost = {
    id : Text;
    content : Text;
    media : ?Storage.ExternalBlob;
    scheduledTime : Time.Time;
    status : PostStatus;
    createdAt : Time.Time;
    updatedAt : Time.Time;
    userId : Principal;
  };

  public type PostStatus = {
    #pending;
    #published;
    #failed;
  };

  transient let textMap = OrderedMap.Make<Text>(Text.compare);
  var scheduledPosts = textMap.empty<ScheduledPost>();

  // Helper function to count user's posts in current week
  private func countUserWeeklyPosts(userId : Principal) : Nat {
    let now = Time.now();
    let oneWeek : Time.Time = 7 * 24 * 60 * 60 * 1_000_000_000; // 7 days in nanoseconds
    let weekStart = now - oneWeek;
    
    let posts = textMap.vals(scheduledPosts);
    var count = 0;
    for (post in posts) {
      if (post.userId == userId and post.createdAt >= weekStart) {
        count += 1;
      };
    };
    count;
  };

  // Helper function to check if user can create more posts
  private func canCreatePost(userId : Principal) : Bool {
    let profile = principalMap.get(userProfiles, userId);
    let weeklyCount = countUserWeeklyPosts(userId);
    
    switch (profile) {
      case (null) { false }; // No profile means no posts allowed
      case (?p) {
        if (p.isPremium) {
          weeklyCount < 100; // Premium: 100 posts per week
        } else {
          weeklyCount < 10; // Free: 10 posts per week
        };
      };
    };
  };

  public shared ({ caller }) func createScheduledPost(post : ScheduledPost) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can create posts");
    };
    
    // Verify the post belongs to the caller
    if (post.userId != caller) {
      Debug.trap("Unauthorized: Cannot create posts for other users");
    };
    
    // Check usage limits
    if (not canCreatePost(caller)) {
      let profile = principalMap.get(userProfiles, caller);
      switch (profile) {
        case (?p) {
          if (p.isPremium) {
            Debug.trap("Weekly limit reached: Premium users can schedule up to 100 posts per week");
          } else {
            Debug.trap("Weekly limit reached: Free users can schedule up to 10 posts per week. Upgrade to Premium for more.");
          };
        };
        case (null) {
          Debug.trap("User profile not found. Please create a profile first.");
        };
      };
    };
    
    scheduledPosts := textMap.put(scheduledPosts, post.id, post);
  };

  public query ({ caller }) func getScheduledPost(id : Text) : async ?ScheduledPost {
    let post = textMap.get(scheduledPosts, id);
    switch (post) {
      case (null) { null };
      case (?p) {
        if (p.userId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Debug.trap("Unauthorized: Can only view your own posts");
        };
        ?p;
      };
    };
  };

  public query ({ caller }) func getUserScheduledPosts() : async [ScheduledPost] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view their posts");
    };
    let posts = textMap.vals(scheduledPosts);
    let userPosts = Array.filter<ScheduledPost>(
      Iter.toArray(posts),
      func(post) { post.userId == caller },
    );
    userPosts;
  };

  public query ({ caller }) func getAllScheduledPosts() : async [ScheduledPost] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can view all posts");
    };
    let posts = textMap.vals(scheduledPosts);
    Iter.toArray(posts);
  };

  public shared ({ caller }) func updateScheduledPost(post : ScheduledPost) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update posts");
    };
    
    let existing = textMap.get(scheduledPosts, post.id);
    switch (existing) {
      case (null) {
        Debug.trap("Post not found");
      };
      case (?p) {
        if (p.userId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Debug.trap("Unauthorized: Can only update your own posts");
        };
        
        // Verify the updated post still belongs to the original owner
        if (post.userId != p.userId) {
          Debug.trap("Unauthorized: Cannot change post ownership");
        };
        
        scheduledPosts := textMap.put(scheduledPosts, post.id, post);
      };
    };
  };

  public shared ({ caller }) func deleteScheduledPost(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can delete posts");
    };
    
    let existing = textMap.get(scheduledPosts, id);
    switch (existing) {
      case (null) {
        Debug.trap("Post not found");
      };
      case (?p) {
        if (p.userId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Debug.trap("Unauthorized: Can only delete your own posts");
        };
        scheduledPosts := textMap.delete(scheduledPosts, id);
      };
    };
  };

  public shared ({ caller }) func updatePostStatus(id : Text, status : PostStatus) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can update post status");
    };
    
    let existing = textMap.get(scheduledPosts, id);
    switch (existing) {
      case (null) {
        Debug.trap("Post not found");
      };
      case (?p) {
        let updatedPost = {
          id = p.id;
          content = p.content;
          media = p.media;
          scheduledTime = p.scheduledTime;
          status;
          createdAt = p.createdAt;
          updatedAt = Time.now();
          userId = p.userId;
        };
        scheduledPosts := textMap.put(scheduledPosts, id, updatedPost);
      };
    };
  };

  public query ({ caller }) func getWeeklyPostCount() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can check their post count");
    };
    countUserWeeklyPosts(caller);
  };

  public query ({ caller }) func getRemainingWeeklyPosts() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can check their remaining posts");
    };
    
    let profile = principalMap.get(userProfiles, caller);
    let weeklyCount = countUserWeeklyPosts(caller);
    
    switch (profile) {
      case (null) { 0 };
      case (?p) {
        if (p.isPremium) {
          if (weeklyCount >= 100) { 0 } else { 100 - weeklyCount };
        } else {
          if (weeklyCount >= 10) { 0 } else { 10 - weeklyCount };
        };
      };
    };
  };
};

