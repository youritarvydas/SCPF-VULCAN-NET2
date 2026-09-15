*{box-sizing:border-box}
:root{
--bg:#080b10;--sidebar:#0b0f15;--panel:#0d1219;--border:#202832;
--border-light:#2a333e;--text:#e7ebef;--muted:#7f8a97;--blue:#4d9cff;
--green:#48d597;--red:#e05d67
}
html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:Inter,"Segoe UI",Arial,sans-serif}
body{min-height:100vh}button,a{font:inherit}button{border:0}
.Dashboard{min-height:100vh;display:flex}
.Sidebar{width:250px;min-height:100vh;position:fixed;inset:0 auto 0 0;display:flex;flex-direction:column;background:var(--sidebar);border-right:1px solid var(--border)}
.Logo{height:82px;display:flex;align-items:center;gap:12px;padding:0 22px;border-bottom:1px solid var(--border)}
.LogoMark{width:38px;height:38px;display:grid;place-items:center;border:1px solid var(--border-light);background:#111720;color:var(--blue);font-weight:800}
.Logo strong{display:block;font-size:14px;letter-spacing:1.5px}.Logo span{display:block;margin-top:3px;color:var(--muted);font-size:9px;letter-spacing:1.5px}
.Navigation{padding:18px 12px}.NavItem{height:44px;margin-bottom:6px;padding:0 14px;display:flex;align-items:center;gap:12px;color:var(--muted);text-decoration:none;border:1px solid transparent;font-size:13px;transition:.15s ease}
.NavItem span{width:18px;text-align:center;font-size:16px}.NavItem:hover{color:var(--text);background:var(--panel);border-color:var(--border)}
.NavItem.active{color:var(--text);background:#101720;border-color:#273443}.NavItem.active span{color:var(--blue)}
.SidebarBottom{margin-top:auto;padding:14px;border-top:1px solid var(--border)}
.SystemStatus{display:flex;align-items:center;gap:10px;padding:10px;margin-bottom:10px}.StatusDot{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 10px rgba(72,213,151,.45)}
.SystemStatus strong,.SystemStatus small{display:block}.SystemStatus strong{font-size:9px;letter-spacing:1px}.SystemStatus small{margin-top:3px;color:var(--muted);font-size:9px}
.LogoutButton{width:100%;height:40px;display:flex;align-items:center;gap:10px;padding:0 12px;cursor:pointer;color:var(--muted);background:transparent;border:1px solid var(--border);text-align:left}.LogoutButton:hover{color:var(--text);background:var(--panel)}
.Main{width:calc(100% - 250px);margin-left:250px;padding:0 34px 28px}
.TopBar{min-height:82px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border)}
.Eyebrow,.SectionLabel,.Muted{color:var(--muted);font-size:9px;font-weight:700;letter-spacing:1.6px}
.TopBar h1{margin:5px 0 0;font-size:22px;font-weight:600}.Account{display:flex;align-items:center;gap:10px}
.AccountAvatar{width:36px;height:36px;display:grid;place-items:center;background:#151c25;border:1px solid var(--border-light);color:var(--blue);font-size:13px;font-weight:700}
.Account strong,.Account span{display:block}.Account strong{font-size:12px}.Account span{margin-top:3px;color:var(--muted);font-size:9px}
.ApplicationHero{margin-top:28px;padding:28px;display:flex;align-items:center;gap:22px;background:linear-gradient(135deg,#101720,#0d1219);border:1px solid var(--border)}
.HeroIcon{width:58px;height:58px;display:grid;place-items:center;border:1px solid #304157;background:#111b28;color:var(--blue);font-size:11px;font-weight:800;letter-spacing:1px}
.ApplicationHero h2{margin:7px 0 5px;font-size:22px;font-weight:600}.ApplicationHero p{margin:0;max-width:650px;color:var(--muted);font-size:12px;line-height:1.6}
.Panel{margin-top:18px;padding:24px;background:var(--panel);border:1px solid var(--border)}
.PanelHeader{display:flex;justify-content:space-between;align-items:center;padding-bottom:18px;border-bottom:1px solid var(--border)}.PanelHeader h3{margin:6px 0 0;font-size:15px;font-weight:600}
.StatusBadge{padding:6px 9px;color:var(--green);border:1px solid rgba(72,213,151,.25);background:rgba(72,213,151,.06);font-size:8px;font-weight:700;letter-spacing:1.2px}
.ExperimentCard{margin-top:20px;padding:18px;display:flex;justify-content:space-between;align-items:center;background:#0a0f15;border:1px solid var(--border)}
.ExperimentIdentity{display:flex;align-items:center;gap:14px}.ExperimentIcon{width:46px;height:46px;display:grid;place-items:center;background:#111923;border:1px solid var(--border-light);color:var(--blue);font-size:9px;font-weight:800}
.ExperimentIdentity span,.ExperimentIdentity strong{display:block}.ExperimentIdentity strong{margin-top:6px;font-size:14px;letter-spacing:.5px}
.ExperimentDetails{display:flex;gap:45px}.ExperimentDetails span,.ExperimentDetails strong{display:block}.ExperimentDetails span{color:var(--muted);font-size:8px;letter-spacing:1.2px}.ExperimentDetails strong{margin-top:6px;font-size:11px}
.LaunchArea{margin-top:22px;text-align:center}.LaunchButton{min-width:230px;height:46px;padding:0 22px;cursor:pointer;color:#fff;background:#17283d;border:1px solid #355477;font-size:12px;font-weight:700;letter-spacing:.5px;transition:.15s ease}
.LaunchButton span{margin-right:8px;color:var(--blue)}.LaunchButton:hover{background:#1d334d;border-color:#4d719b;transform:translateY(-1px)}.LaunchButton:active{transform:translateY(0)}
.ErrorMessage{min-height:14px;margin:10px 0 0;color:var(--red);font-size:10px}.LaunchHint{margin:2px auto 0;max-width:560px;color:var(--muted);font-size:9px;line-height:1.5}
.InformationGrid{margin-top:18px;display:grid;grid-template-columns:repeat(2,1fr);gap:18px}.InfoBox{min-height:92px;display:flex;align-items:flex-start;gap:14px;padding:18px;background:var(--panel);border:1px solid var(--border)}
.InfoIcon{width:28px;height:28px;flex:0 0 auto;display:grid;place-items:center;border:1px solid var(--border-light);color:var(--blue);font-size:12px;font-weight:700}.InfoBox strong{display:block;font-size:11px}.InfoBox p{margin:6px 0 0;color:var(--muted);font-size:10px;line-height:1.5}
.Footer{margin-top:28px;padding-top:18px;display:flex;justify-content:space-between;color:#4e5864;border-top:1px solid var(--border);font-size:8px;letter-spacing:1.2px}
@media(max-width:800px){.Sidebar{width:210px}.Main{width:calc(100% - 210px);margin-left:210px;padding:0 20px 24px}.ExperimentCard{align-items:flex-start;gap:20px;flex-direction:column}.InformationGrid{grid-template-columns:1fr}}
@media(max-width:620px){.Sidebar{width:68px}.Logo{justify-content:center;padding:0}.Logo>div:last-child{display:none}.NavItem{justify-content:center;padding:0;font-size:0}.NavItem span{font-size:16px}.SystemStatus{justify-content:center;padding:0}.SystemStatus div{display:none}.LogoutButton{justify-content:center;padding:0;font-size:0}.Main{width:calc(100% - 68px);margin-left:68px;padding:0 14px 20px}.TopBar{align-items:flex-start;padding:16px 0;gap:12px}.Account{display:none}.ApplicationHero{padding:20px}.ExperimentDetails{width:100%;justify-content:space-between;gap:15px}.Footer{gap:10px;flex-direction:column}}
