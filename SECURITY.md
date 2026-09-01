# Security policy

## Supported versions

KitchooK! is currently pre-1.0. Security fixes are provided for the latest released `0.1.x` version. Upgrade to the newest patch release before reporting a problem that may already be fixed.

| Version | Supported |
| --- | --- |
| Latest `0.1.x` release | Yes |
| Older releases | No |

## Report a vulnerability privately

Use [GitHub Private Vulnerability Reporting](https://github.com/Refueled/kitchook/security/advisories/new) to report a suspected vulnerability. Please do not disclose vulnerability details in an issue, discussion, pull request, or other public channel.

Include, when possible:

- the affected source or builder version and immutable image digest;
- the component and configuration involved;
- reproduction steps or a minimal proof of concept;
- the impact you believe is possible; and
- any suggested mitigation.

You should receive an acknowledgement within seven days. The maintainer will investigate, coordinate a fix and release when warranted, and credit reporters who want attribution. Please allow time for a supported release before public disclosure.

## Scope

Reports about KitchooK! source, its published OCI builder, generated-site behavior, and repository automation are in scope. Vulnerabilities in a user's static host, private recipe repository, network, or third-party service should normally be reported to that operator or provider.

A generated cookbook publishes every active recipe into static files. Draft or archived status controls build output; it is not access control. Operators are responsible for protecting private source and restricting access to generated sites that are not intended to be public.
