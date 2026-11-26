// SPDX-License-Identifier: LicenseRef-AGPL-3.0-only-OpenSSL
// MZGTA modification 2026-11-26: extracted registration metadata helpers.
#include <chiaki/session.h>
#include <string.h>
const char *chiaki_rp_application_reason_string(uint32_t reason)
{
	switch(reason)
	{
		case CHIAKI_RP_APPLICATION_REASON_REGIST_FAILED:
			return "Regist failed, probably invalid PIN";
		case CHIAKI_RP_APPLICATION_REASON_INVALID_PSN_ID:
			return "Invalid PSN ID";
		case CHIAKI_RP_APPLICATION_REASON_IN_USE:
			return "Remote is already in use";
		case CHIAKI_RP_APPLICATION_REASON_CRASH:
			return "Remote Play on Console crashed";
		case CHIAKI_RP_APPLICATION_REASON_RP_VERSION:
			return "RP-Version mismatch";
		default:
			return "unknown";
	}
}

const char *chiaki_rp_version_string(ChiakiTarget version)
{
	switch(version)
	{
		case CHIAKI_TARGET_PS4_8:
			return "8.0";
		case CHIAKI_TARGET_PS4_9:
			return "9.0";
		case CHIAKI_TARGET_PS4_10:
			return "10.0";
		case CHIAKI_TARGET_PS5_1:
			return "1.0";
		default:
			return NULL;
	}
}

CHIAKI_EXPORT ChiakiTarget chiaki_rp_version_parse(const char *rp_version_str, bool is_ps5)
{
	if(is_ps5)
	{
		if(!strcmp(rp_version_str, "1.0"))
			return CHIAKI_TARGET_PS5_1;
		return CHIAKI_TARGET_PS5_UNKNOWN;
	}
	if(!strcmp(rp_version_str, "8.0"))
		return CHIAKI_TARGET_PS4_8;
	if(!strcmp(rp_version_str, "9.0"))
		return CHIAKI_TARGET_PS4_9;
	if(!strcmp(rp_version_str, "10.0"))
		return CHIAKI_TARGET_PS4_10;
	return CHIAKI_TARGET_PS4_UNKNOWN;
}

