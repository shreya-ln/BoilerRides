When signing up:
    - When user clicks verification email link, it opens a new page and confirms them in the backend
        - However, the URL header shows link has expired or incorrect confusing users

When creating profile:
    - There are two save buttons, one at top and one at bottom
        - We should only have one.
        - Top button fails and reloads page, then it works when reclicked
    - On second creation, it takes to profile page
        - Warning at top saying: "Please complete your profile to continue"
        - Cannot advance, every time I click save changes it refreshes the page
            - Could only resolve by switching from localhost to IP address based frontend and then logging in
            - Was taken to home page


When opening Home page, error in console:
@supabase_supabase-js.js?v=7bc4ec92:4404 
 GET https://tckiohuzjbooejhfcbez.supabase.co/rest/v1/ride_bookings?select=seats…t_name%2Cavatar_url%29%29&rider_id=eq.a9e934dd-e122-466c-bd22-3ce5535b2fbf 404 (Not Found)
(anonymous)	@	@supabase_supabase-js.js?v=7bc4ec92:4404
(anonymous)	@	@supabase_supabase-js.js?v=7bc4ec92:4425
fulfilled	@	@supabase_supabase-js.js?v=7bc4ec92:4377
Promise.then		
step	@	@supabase_supabase-js.js?v=7bc4ec92:4390
(anonymous)	@	@supabase_supabase-js.js?v=7bc4ec92:4392
__awaiter8	@	@supabase_supabase-js.js?v=7bc4ec92:4374
(anonymous)	@	@supabase_supabase-js.js?v=7bc4ec92:4415
then	@	@supabase_supabase-js.js?v=7bc4ec92:90
            