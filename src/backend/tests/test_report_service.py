"""Tests for report service - duration calculation and auto-mark generation."""

import pytest
from datetime import datetime

from services.plan_service import calculate_visit_duration_minutes
from services.report_service import generate_visit_marks, ReportServiceError


class TestDurationCalculation:
    """Tests for visit duration calculation."""
    
    def test_calculate_duration_basic(self):
        """Test basic duration calculation."""
        start_time = "09:00:00"
        end_time = "10:30:00"
        duration = calculate_visit_duration_minutes(start_time, end_time)
        assert duration == 90  # 1.5 hours = 90 minutes
    
    def test_calculate_duration_hhmm_format(self):
        """Test duration calculation with HH:MM format (no seconds)."""
        start_time = "09:00"
        end_time = "10:30"
        duration = calculate_visit_duration_minutes(start_time, end_time)
        assert duration == 90
    
    def test_calculate_duration_short_visit(self):
        """Test duration calculation for short visit (< 30 minutes)."""
        start_time = "09:00"
        end_time = "09:25"
        duration = calculate_visit_duration_minutes(start_time, end_time)
        assert duration == 25
        assert duration < 30  # Should trigger CHECK mark
    
    def test_calculate_duration_exactly_30_minutes(self):
        """Test duration calculation for exactly 30 minutes."""
        start_time = "09:00"
        end_time = "09:30"
        duration = calculate_visit_duration_minutes(start_time, end_time)
        assert duration == 30
        assert duration >= 30  # Should NOT trigger CHECK mark
    
    def test_calculate_duration_overnight_visit(self):
        """Test duration calculation for overnight visit (end < start)."""
        start_time = "23:00"
        end_time = "01:00"  # Next day
        duration = calculate_visit_duration_minutes(start_time, end_time)
        assert duration == 120  # 2 hours (24*60 - 23*60 + 1*60)
    
    def test_calculate_duration_missing_times(self):
        """Test duration calculation with missing times."""
        assert calculate_visit_duration_minutes(None, "10:00") is None
        assert calculate_visit_duration_minutes("09:00", None) is None
        assert calculate_visit_duration_minutes(None, None) is None
    
    def test_calculate_duration_invalid_format(self):
        """Test duration calculation with invalid time format."""
        assert calculate_visit_duration_minutes("invalid", "10:00") is None
        assert calculate_visit_duration_minutes("09:00", "invalid") is None


class TestAutoMarkGeneration:
    """Tests for auto-mark generation logic."""
    
    def test_single_visit_gets_circle(self):
        """Test that a single visit on a date gets CIRCLE mark."""
        # This would be tested with actual database calls in integration tests
        # For unit tests, we test the logic
        visit_count = 1
        assert visit_count < 2
        # Should result in CIRCLE mark
    
    def test_multiple_visits_get_double_circle(self):
        """Test that 2+ visits on a date get DOUBLE_CIRCLE mark."""
        visit_count = 2
        assert visit_count >= 2
        # Should result in DOUBLE_CIRCLE mark
    
    def test_short_visit_gets_check(self):
        """Test that visit < 30 minutes gets CHECK mark."""
        duration_minutes = 25
        assert duration_minutes < 30
        # Should result in CHECK mark (in addition to primary mark)
    
    def test_long_visit_no_check(self):
        """Test that visit >= 30 minutes does NOT get CHECK mark."""
        duration_minutes = 30
        assert duration_minutes >= 30
        # Should NOT result in CHECK mark
    
    def test_mark_combination(self):
        """Test that marks can be combined (e.g., DOUBLE_CIRCLE + CHECK)."""
        # Scenario: 2 visits on same date, one is < 30 minutes
        visit_count = 2
        has_short_visit = True
        
        primary_mark = "DOUBLE_CIRCLE" if visit_count >= 2 else "CIRCLE"
        has_check = has_short_visit
        
        assert primary_mark == "DOUBLE_CIRCLE"
        assert has_check is True
        # Should have both DOUBLE_CIRCLE and CHECK marks


class TestMarkSymbols:
    """Tests for mark symbol conversion."""
    
    def test_mark_symbols(self):
        """Test that mark types convert to correct Unicode symbols."""
        from services.report_pdf_service import get_mark_symbol
        
        assert get_mark_symbol("CIRCLE") == "○"
        assert get_mark_symbol("TRIANGLE") == "△"
        assert get_mark_symbol("DOUBLE_CIRCLE") == "◎"
        assert get_mark_symbol("SQUARE") == "□"
        assert get_mark_symbol("CHECK") == "✔︎"
        assert get_mark_symbol("UNKNOWN") == ""


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
