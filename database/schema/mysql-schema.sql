/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `academic_years`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `academic_years` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `admin_conversations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_conversations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parent_id` bigint unsigned NOT NULL,
  `admin_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `admin_conversations_parent_id_foreign` (`parent_id`),
  KEY `admin_conversations_admin_id_foreign` (`admin_id`),
  CONSTRAINT `admin_conversations_admin_id_foreign` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `admin_conversations_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `parents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `admin_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_messages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `admin_conversation_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `admin_messages_admin_conversation_id_foreign` (`admin_conversation_id`),
  KEY `admin_messages_user_id_foreign` (`user_id`),
  CONSTRAINT `admin_messages_admin_conversation_id_foreign` FOREIGN KEY (`admin_conversation_id`) REFERENCES `admin_conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `admin_messages_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `announcements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `announcements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `banner` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `published_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `announcements_user_id_foreign` (`user_id`),
  CONSTRAINT `announcements_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `app_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `app_notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci,
  `data` json DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `app_notifications_user_id_read_at_index` (`user_id`,`read_at`),
  CONSTRAINT `app_notifications_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `attendances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `attendance_time` timestamp NOT NULL,
  `checkout_time` timestamp NULL DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'tepat_waktu',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `academic_year_id` bigint unsigned DEFAULT NULL,
  `semester_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `attendances_student_id_foreign` (`student_id`),
  KEY `attendances_academic_year_id_foreign` (`academic_year_id`),
  KEY `attendances_semester_id_foreign` (`semester_id`),
  CONSTRAINT `attendances_academic_year_id_foreign` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE SET NULL,
  CONSTRAINT `attendances_semester_id_foreign` FOREIGN KEY (`semester_id`) REFERENCES `semesters` (`id`) ON DELETE SET NULL,
  CONSTRAINT `attendances_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `calendars`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `calendars` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_holiday` tinyint(1) NOT NULL DEFAULT '1',
  `is_self_study` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `conversations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `conversations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parent_id` bigint unsigned NOT NULL,
  `teacher_id` bigint unsigned NOT NULL,
  `student_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `conversations_parent_id_foreign` (`parent_id`),
  KEY `conversations_teacher_id_foreign` (`teacher_id`),
  KEY `conversations_student_id_foreign` (`student_id`),
  CONSTRAINT `conversations_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `parents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `conversations_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `conversations_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `extracurricular_attendances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `extracurricular_attendances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `extracurricular_id` bigint unsigned NOT NULL,
  `student_id` bigint unsigned NOT NULL,
  `academic_year_id` bigint unsigned NOT NULL,
  `semester_id` bigint unsigned NOT NULL,
  `status` enum('hadir','sakit','izin','alpa') COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `attendance_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `extracurricular_attendance_unique` (`extracurricular_id`,`student_id`,`attendance_date`),
  KEY `extracurricular_attendances_student_id_foreign` (`student_id`),
  KEY `extracurricular_attendances_academic_year_id_foreign` (`academic_year_id`),
  KEY `extracurricular_attendances_semester_id_foreign` (`semester_id`),
  CONSTRAINT `extracurricular_attendances_academic_year_id_foreign` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE CASCADE,
  CONSTRAINT `extracurricular_attendances_extracurricular_id_foreign` FOREIGN KEY (`extracurricular_id`) REFERENCES `extracurriculars` (`id`) ON DELETE CASCADE,
  CONSTRAINT `extracurricular_attendances_semester_id_foreign` FOREIGN KEY (`semester_id`) REFERENCES `semesters` (`id`) ON DELETE CASCADE,
  CONSTRAINT `extracurricular_attendances_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `extracurricular_student`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `extracurricular_student` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `extracurricular_id` bigint unsigned NOT NULL,
  `student_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `extracurricular_student_extracurricular_id_student_id_unique` (`extracurricular_id`,`student_id`),
  KEY `extracurricular_student_student_id_foreign` (`student_id`),
  CONSTRAINT `extracurricular_student_extracurricular_id_foreign` FOREIGN KEY (`extracurricular_id`) REFERENCES `extracurriculars` (`id`) ON DELETE CASCADE,
  CONSTRAINT `extracurricular_student_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `extracurriculars`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `extracurriculars` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `teacher_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `extracurriculars_teacher_id_foreign` (`teacher_id`),
  CONSTRAINT `extracurriculars_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `gradebook_final_scores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gradebook_final_scores` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `subject_id` bigint unsigned NOT NULL,
  `school_class_id` bigint unsigned NOT NULL,
  `academic_year_id` bigint unsigned DEFAULT NULL,
  `semester_id` bigint unsigned DEFAULT NULL,
  `score` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `final_score_unique` (`student_id`,`subject_id`,`school_class_id`,`academic_year_id`,`semester_id`),
  KEY `gradebook_final_scores_subject_id_foreign` (`subject_id`),
  KEY `gradebook_final_scores_school_class_id_foreign` (`school_class_id`),
  KEY `gradebook_final_scores_academic_year_id_foreign` (`academic_year_id`),
  KEY `gradebook_final_scores_semester_id_foreign` (`semester_id`),
  CONSTRAINT `gradebook_final_scores_academic_year_id_foreign` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE SET NULL,
  CONSTRAINT `gradebook_final_scores_school_class_id_foreign` FOREIGN KEY (`school_class_id`) REFERENCES `school_classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `gradebook_final_scores_semester_id_foreign` FOREIGN KEY (`semester_id`) REFERENCES `semesters` (`id`) ON DELETE SET NULL,
  CONSTRAINT `gradebook_final_scores_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `gradebook_final_scores_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `leave_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `parent_id` bigint unsigned NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `type` enum('sakit','izin') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `attachment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `approved_by` bigint unsigned DEFAULT NULL,
  `rejection_reason` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `leave_requests_student_id_foreign` (`student_id`),
  KEY `leave_requests_parent_id_foreign` (`parent_id`),
  KEY `leave_requests_approved_by_foreign` (`approved_by`),
  CONSTRAINT `leave_requests_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `leave_requests_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `parents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `leave_requests_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `levels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `levels` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lms_ai_caches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_ai_caches` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `prompt_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `prompt_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `input_params` json DEFAULT NULL,
  `generated_response` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `lms_ai_caches_prompt_hash_unique` (`prompt_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lms_ai_prompts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_ai_prompts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `teacher_id` bigint unsigned DEFAULT NULL COMMENT 'Null untuk prompt default sistem, terisi id guru untuk kustomisasi',
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `prompt_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `placeholders` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `lms_ai_prompts_teacher_id_key_unique` (`teacher_id`,`key`),
  CONSTRAINT `lms_ai_prompts_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lms_announcements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_announcements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `teacher_id` bigint unsigned NOT NULL,
  `school_class_id` bigint unsigned DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `priority` enum('info','warning','important') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'info',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lms_announcements_teacher_id_foreign` (`teacher_id`),
  KEY `lms_announcements_school_class_id_foreign` (`school_class_id`),
  CONSTRAINT `lms_announcements_school_class_id_foreign` FOREIGN KEY (`school_class_id`) REFERENCES `school_classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lms_announcements_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lms_assignment_school_class`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_assignment_school_class` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `assignment_id` bigint unsigned NOT NULL,
  `school_class_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `assignment_class_unique` (`assignment_id`,`school_class_id`),
  CONSTRAINT `lms_assignment_school_class_assignment_id_foreign` FOREIGN KEY (`assignment_id`) REFERENCES `lms_assignments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lms_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_assignments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `assessment_type` enum('initial','formative','summative') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'summative',
  `instrument_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `instrument_config` json DEFAULT NULL,
  `scoring_tool` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `scoring_tool_config` json DEFAULT NULL,
  `subject_id` bigint unsigned NOT NULL,
  `learning_objective_id` bigint unsigned DEFAULT NULL,
  `teacher_id` bigint unsigned NOT NULL,
  `academic_year_id` bigint unsigned DEFAULT NULL,
  `semester_id` bigint unsigned DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `due_date` datetime DEFAULT NULL,
  `max_points` int NOT NULL DEFAULT '100',
  `passing_grade` int NOT NULL DEFAULT '70',
  `order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lms_assignments_subject_id_foreign` (`subject_id`),
  KEY `lms_assignments_teacher_id_foreign` (`teacher_id`),
  KEY `lms_assignments_academic_year_id_foreign` (`academic_year_id`),
  KEY `lms_assignments_semester_id_foreign` (`semester_id`),
  KEY `lms_assignments_learning_objective_id_foreign` (`learning_objective_id`),
  CONSTRAINT `lms_assignments_academic_year_id_foreign` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`),
  CONSTRAINT `lms_assignments_learning_objective_id_foreign` FOREIGN KEY (`learning_objective_id`) REFERENCES `lms_learning_objectives` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lms_assignments_semester_id_foreign` FOREIGN KEY (`semester_id`) REFERENCES `semesters` (`id`),
  CONSTRAINT `lms_assignments_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`),
  CONSTRAINT `lms_assignments_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lms_capaian_pembelajaran`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_capaian_pembelajaran` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `kode` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fase` enum('Fondasi','A','B','C','D','E','F') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'D',
  `elemen` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subject_id` bigint unsigned NOT NULL,
  `deskripsi` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `lms_capaian_pembelajaran_kode_unique` (`kode`),
  KEY `lms_capaian_pembelajaran_subject_id_foreign` (`subject_id`),
  CONSTRAINT `lms_capaian_pembelajaran_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lms_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_comments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `assignment_id` bigint unsigned DEFAULT NULL,
  `material_id` bigint unsigned DEFAULT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lms_comments_user_id_foreign` (`user_id`),
  KEY `lms_comments_assignment_id_foreign` (`assignment_id`),
  KEY `lms_comments_material_id_foreign` (`material_id`),
  CONSTRAINT `lms_comments_assignment_id_foreign` FOREIGN KEY (`assignment_id`) REFERENCES `lms_assignments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lms_comments_material_id_foreign` FOREIGN KEY (`material_id`) REFERENCES `lms_materials` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lms_comments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lms_feedback_revisions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_feedback_revisions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `submission_id` bigint unsigned NOT NULL,
  `teacher_id` bigint unsigned NOT NULL,
  `feedback` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending_revision','revised','approved') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending_revision',
  `revision_count` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lms_feedback_revisions_teacher_id_foreign` (`teacher_id`),
  KEY `lms_feedback_revisions_submission_id_foreign` (`submission_id`),
  CONSTRAINT `lms_feedback_revisions_submission_id_foreign` FOREIGN KEY (`submission_id`) REFERENCES `lms_submissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lms_feedback_revisions_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lms_learning_objectives`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_learning_objectives` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `subject_id` bigint unsigned NOT NULL,
  `school_class_id` bigint unsigned DEFAULT NULL,
  `teacher_id` bigint unsigned NOT NULL,
  `academic_year_id` bigint unsigned NOT NULL,
  `semester_id` bigint unsigned NOT NULL,
  `code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Contoh: TP 1.1',
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `competence` text COLLATE utf8mb4_unicode_ci,
  `content` text COLLATE utf8mb4_unicode_ci,
  `formulation_method` enum('direct','analysis','cross_element') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'direct',
  `sequencing_method` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sequencing_notes` text COLLATE utf8mb4_unicode_ci,
  `order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `cp_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lms_learning_objectives_subject_id_foreign` (`subject_id`),
  KEY `lms_learning_objectives_teacher_id_foreign` (`teacher_id`),
  KEY `lms_learning_objectives_academic_year_id_foreign` (`academic_year_id`),
  KEY `lms_learning_objectives_semester_id_foreign` (`semester_id`),
  KEY `lms_learning_objectives_school_class_id_foreign` (`school_class_id`),
  KEY `lms_learning_objectives_cp_id_foreign` (`cp_id`),
  CONSTRAINT `lms_learning_objectives_academic_year_id_foreign` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lms_learning_objectives_cp_id_foreign` FOREIGN KEY (`cp_id`) REFERENCES `lms_capaian_pembelajaran` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lms_learning_objectives_school_class_id_foreign` FOREIGN KEY (`school_class_id`) REFERENCES `school_classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lms_learning_objectives_semester_id_foreign` FOREIGN KEY (`semester_id`) REFERENCES `semesters` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lms_learning_objectives_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lms_learning_objectives_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lms_material_resources`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_material_resources` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `material_id` bigint unsigned NOT NULL,
  `type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lms_material_resources_material_id_foreign` (`material_id`),
  CONSTRAINT `lms_material_resources_material_id_foreign` FOREIGN KEY (`material_id`) REFERENCES `lms_materials` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lms_material_school_class`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_material_school_class` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `material_id` bigint unsigned NOT NULL,
  `school_class_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `material_class_unique` (`material_id`,`school_class_id`),
  CONSTRAINT `lms_material_school_class_material_id_foreign` FOREIGN KEY (`material_id`) REFERENCES `lms_materials` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lms_materials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_materials` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `subject_id` bigint unsigned NOT NULL,
  `learning_objective_id` bigint unsigned DEFAULT NULL,
  `teacher_id` bigint unsigned NOT NULL,
  `academic_year_id` bigint unsigned DEFAULT NULL,
  `semester_id` bigint unsigned DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `pedagogical_model` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'PjBL, PBL, Inquiry, etc',
  `learning_environment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Physical, Virtual, Hybrid',
  `understanding_activity` text COLLATE utf8mb4_unicode_ci COMMENT 'Tahap Memahami',
  `application_activity` text COLLATE utf8mb4_unicode_ci COMMENT 'Tahap Mengaplikasi',
  `reflection_activity` text COLLATE utf8mb4_unicode_ci COMMENT 'Tahap Merefleksi',
  `image_prompt` text COLLATE utf8mb4_unicode_ci COMMENT 'Deskripsi gambar ilustrasi visual dari AI',
  `lkpd` text COLLATE utf8mb4_unicode_ci COMMENT 'Lembar Kerja Peserta Didik (LKPD) dari AI',
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `thumbnail` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `external_link` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lms_materials_subject_id_foreign` (`subject_id`),
  KEY `lms_materials_teacher_id_foreign` (`teacher_id`),
  KEY `lms_materials_academic_year_id_foreign` (`academic_year_id`),
  KEY `lms_materials_semester_id_foreign` (`semester_id`),
  KEY `lms_materials_learning_objective_id_foreign` (`learning_objective_id`),
  CONSTRAINT `lms_materials_academic_year_id_foreign` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`),
  CONSTRAINT `lms_materials_learning_objective_id_foreign` FOREIGN KEY (`learning_objective_id`) REFERENCES `lms_learning_objectives` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lms_materials_semester_id_foreign` FOREIGN KEY (`semester_id`) REFERENCES `semesters` (`id`),
  CONSTRAINT `lms_materials_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`),
  CONSTRAINT `lms_materials_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lms_modul_ajars`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_modul_ajars` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `teacher_id` bigint unsigned NOT NULL,
  `subject_id` bigint unsigned NOT NULL,
  `school_class_id` bigint unsigned NOT NULL,
  `learning_objective_id` bigint unsigned NOT NULL,
  `material_id` bigint unsigned NOT NULL,
  `academic_year_id` bigint unsigned DEFAULT NULL,
  `semester_id` bigint unsigned DEFAULT NULL,
  `pedagogical_model` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `general_info` longtext COLLATE utf8mb4_unicode_ci,
  `learning_design` longtext COLLATE utf8mb4_unicode_ci,
  `learning_steps` longtext COLLATE utf8mb4_unicode_ci,
  `assessment_plan` longtext COLLATE utf8mb4_unicode_ci,
  `kktp_details` longtext COLLATE utf8mb4_unicode_ci,
  `lkpd` longtext COLLATE utf8mb4_unicode_ci,
  `learning_resources` longtext COLLATE utf8mb4_unicode_ci,
  `ai_prompt_used` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lms_p5_dimensi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_p5_dimensi` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `kode` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Contoh: BERIMAN, BERKEBINEKAAN, GOTONG_ROYONG, MANDIRI, BERNALAR_KREATIF',
  `nama` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `deskripsi` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `lms_p5_dimensi_kode_unique` (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lms_p5_elements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_p5_elements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `dimensi_id` bigint unsigned NOT NULL,
  `nama` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `deskripsi` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lms_p5_elements_dimensi_id_foreign` (`dimensi_id`),
  CONSTRAINT `lms_p5_elements_dimensi_id_foreign` FOREIGN KEY (`dimensi_id`) REFERENCES `lms_p5_dimensi` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lms_p5_project_scores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_p5_project_scores` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint unsigned NOT NULL,
  `student_id` bigint unsigned NOT NULL,
  `sub_element_id` bigint unsigned NOT NULL,
  `nilai` enum('BB','MB','BSH','SB') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'BB=Belum Berkembang, MB=Mulai Berkembang, BSH=Berkembang Sesuai Harapan, SB=Sangat Baik',
  `catatan` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `p5_score_unique` (`project_id`,`student_id`,`sub_element_id`),
  KEY `lms_p5_project_scores_student_id_foreign` (`student_id`),
  KEY `lms_p5_project_scores_sub_element_id_foreign` (`sub_element_id`),
  CONSTRAINT `lms_p5_project_scores_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `lms_p5_projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lms_p5_project_scores_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lms_p5_project_scores_sub_element_id_foreign` FOREIGN KEY (`sub_element_id`) REFERENCES `lms_p5_sub_elements` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lms_p5_projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_p5_projects` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `judul` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `deskripsi` text COLLATE utf8mb4_unicode_ci,
  `tema` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Tema Projek: Gaya Hidup Berkelanjutan, dll',
  `school_class_id` bigint unsigned NOT NULL,
  `academic_year_id` bigint unsigned NOT NULL,
  `semester_id` bigint unsigned NOT NULL,
  `dimensi_ids` json NOT NULL COMMENT 'Array of lms_p5_dimensi ids',
  `sub_element_ids` json DEFAULT NULL,
  `alokasi_waktu` int DEFAULT NULL COMMENT 'Total JP',
  `status` enum('draft','active','selesai') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lms_p5_projects_school_class_id_foreign` (`school_class_id`),
  KEY `lms_p5_projects_academic_year_id_foreign` (`academic_year_id`),
  KEY `lms_p5_projects_semester_id_foreign` (`semester_id`),
  CONSTRAINT `lms_p5_projects_academic_year_id_foreign` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lms_p5_projects_school_class_id_foreign` FOREIGN KEY (`school_class_id`) REFERENCES `school_classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lms_p5_projects_semester_id_foreign` FOREIGN KEY (`semester_id`) REFERENCES `semesters` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lms_p5_sub_elements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_p5_sub_elements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `element_id` bigint unsigned NOT NULL,
  `nama` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `deskripsi` text COLLATE utf8mb4_unicode_ci,
  `jenjang` enum('SD','SMP','SMA','SMK') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SMP',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lms_p5_sub_elements_element_id_foreign` (`element_id`),
  CONSTRAINT `lms_p5_sub_elements_element_id_foreign` FOREIGN KEY (`element_id`) REFERENCES `lms_p5_elements` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lms_reflections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_reflections` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `assignment_id` bigint unsigned DEFAULT NULL,
  `material_id` bigint unsigned DEFAULT NULL,
  `understanding_level` int NOT NULL COMMENT '1-5 scale',
  `interesting_thing` text COLLATE utf8mb4_unicode_ci,
  `difficulty` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lms_reflections_student_id_foreign` (`student_id`),
  KEY `lms_reflections_assignment_id_foreign` (`assignment_id`),
  KEY `lms_reflections_material_id_foreign` (`material_id`),
  CONSTRAINT `lms_reflections_assignment_id_foreign` FOREIGN KEY (`assignment_id`) REFERENCES `lms_assignments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lms_reflections_material_id_foreign` FOREIGN KEY (`material_id`) REFERENCES `lms_materials` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lms_reflections_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lms_remedial_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_remedial_records` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `assignment_id` bigint unsigned NOT NULL,
  `subject_id` bigint unsigned NOT NULL,
  `teacher_id` bigint unsigned NOT NULL,
  `type` enum('remedial','pengayaan') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'remedial',
  `initial_score` int DEFAULT NULL,
  `remedial_score` int DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `due_date` date DEFAULT NULL,
  `status` enum('assigned','in_progress','completed','expired') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'assigned',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lms_remedial_records_student_id_foreign` (`student_id`),
  KEY `lms_remedial_records_subject_id_foreign` (`subject_id`),
  KEY `lms_remedial_records_teacher_id_foreign` (`teacher_id`),
  KEY `lms_remedial_records_assignment_id_foreign` (`assignment_id`),
  CONSTRAINT `lms_remedial_records_assignment_id_foreign` FOREIGN KEY (`assignment_id`) REFERENCES `lms_assignments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lms_remedial_records_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`),
  CONSTRAINT `lms_remedial_records_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`),
  CONSTRAINT `lms_remedial_records_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lms_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_sessions` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `lms_sessions_user_id_index` (`user_id`),
  KEY `lms_sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lms_student_materials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_student_materials` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `material_id` bigint unsigned NOT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `lms_student_materials_student_id_material_id_unique` (`student_id`,`material_id`),
  KEY `lms_student_materials_material_id_foreign` (`material_id`),
  CONSTRAINT `lms_student_materials_material_id_foreign` FOREIGN KEY (`material_id`) REFERENCES `lms_materials` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lms_student_materials_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lms_submissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_submissions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `assignment_id` bigint unsigned NOT NULL,
  `student_id` bigint unsigned NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `score` int DEFAULT NULL,
  `attempts` int NOT NULL DEFAULT '1',
  `is_remedial_open` tinyint(1) NOT NULL DEFAULT '0',
  `remedial_history` json DEFAULT NULL,
  `feedback` text COLLATE utf8mb4_unicode_ci,
  `submitted_at` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lms_submissions_assignment_id_foreign` (`assignment_id`),
  KEY `lms_submissions_student_id_foreign` (`student_id`),
  CONSTRAINT `lms_submissions_assignment_id_foreign` FOREIGN KEY (`assignment_id`) REFERENCES `lms_assignments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lms_submissions_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lms_tp_cp`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lms_tp_cp` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tp_id` bigint unsigned NOT NULL,
  `cp_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lms_tp_cp_tp_id_foreign` (`tp_id`),
  KEY `lms_tp_cp_cp_id_foreign` (`cp_id`),
  CONSTRAINT `lms_tp_cp_cp_id_foreign` FOREIGN KEY (`cp_id`) REFERENCES `lms_capaian_pembelajaran` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lms_tp_cp_tp_id_foreign` FOREIGN KEY (`tp_id`) REFERENCES `lms_learning_objectives` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `conversation_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `messages_conversation_id_foreign` (`conversation_id`),
  KEY `messages_user_id_foreign` (`user_id`),
  CONSTRAINT `messages_conversation_id_foreign` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `messages_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `notifications_user_id_foreign` (`user_id`),
  CONSTRAINT `notifications_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `parent_student`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parent_student` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parent_id` bigint unsigned NOT NULL,
  `student_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `parent_student_parent_id_foreign` (`parent_id`),
  KEY `parent_student_student_id_foreign` (`student_id`),
  CONSTRAINT `parent_student_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `parents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `parent_student_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `parents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `photo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `parents_phone_number_unique` (`phone_number`),
  KEY `parents_user_id_foreign` (`user_id`),
  CONSTRAINT `parents_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` bigint unsigned NOT NULL,
  `name` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text COLLATE utf8mb4_unicode_ci,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schedules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `teaching_assignment_id` bigint unsigned NOT NULL,
  `day_of_week` tinyint NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `schedules_teaching_assignment_id_foreign` (`teaching_assignment_id`),
  CONSTRAINT `schedules_teaching_assignment_id_foreign` FOREIGN KEY (`teaching_assignment_id`) REFERENCES `teaching_assignments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `school_classes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `school_classes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `teacher_id` bigint unsigned DEFAULT NULL,
  `level_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `school_classes_name_unique` (`name`),
  UNIQUE KEY `school_classes_teacher_id_unique` (`teacher_id`),
  KEY `school_classes_level_id_foreign` (`level_id`),
  CONSTRAINT `school_classes_level_id_foreign` FOREIGN KEY (`level_id`) REFERENCES `levels` (`id`) ON DELETE SET NULL,
  CONSTRAINT `school_classes_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `semesters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `semesters` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `academic_year_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `semesters_academic_year_id_foreign` (`academic_year_id`),
  CONSTRAINT `semesters_academic_year_id_foreign` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `settings_key_unique` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `student_diagnostic_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_diagnostic_results` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `assignment_id` bigint unsigned NOT NULL,
  `subject_id` bigint unsigned NOT NULL,
  `learning_objective_id` bigint unsigned DEFAULT NULL,
  `total_score` decimal(5,2) DEFAULT NULL,
  `pass_threshold` decimal(5,2) NOT NULL DEFAULT '60.00',
  `is_passed` tinyint(1) NOT NULL DEFAULT '0',
  `topic_breakdown` json DEFAULT NULL,
  `recommendations` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_diagnostic_results_student_id_assignment_id_unique` (`student_id`,`assignment_id`),
  KEY `student_diagnostic_results_subject_id_foreign` (`subject_id`),
  KEY `student_diagnostic_results_learning_objective_id_foreign` (`learning_objective_id`),
  KEY `student_diagnostic_results_assignment_id_foreign` (`assignment_id`),
  CONSTRAINT `student_diagnostic_results_assignment_id_foreign` FOREIGN KEY (`assignment_id`) REFERENCES `lms_assignments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `student_diagnostic_results_learning_objective_id_foreign` FOREIGN KEY (`learning_objective_id`) REFERENCES `lms_learning_objectives` (`id`),
  CONSTRAINT `student_diagnostic_results_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`),
  CONSTRAINT `student_diagnostic_results_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `student_non_cognitive_diagnostics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_non_cognitive_diagnostics` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `subject_id` bigint unsigned DEFAULT NULL,
  `learning_style` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `learning_style_detail` json DEFAULT NULL,
  `motivation_level` json DEFAULT NULL,
  `interests` json DEFAULT NULL,
  `family_background` json DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_non_cognitive_diagnostics_student_id_subject_id_unique` (`student_id`,`subject_id`),
  KEY `student_non_cognitive_diagnostics_subject_id_foreign` (`subject_id`),
  CONSTRAINT `student_non_cognitive_diagnostics_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`),
  CONSTRAINT `student_non_cognitive_diagnostics_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `student_permits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_permits` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `attendance_id` bigint unsigned NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `time_out` timestamp NOT NULL,
  `time_in` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `student_permits_student_id_foreign` (`student_id`),
  KEY `student_permits_attendance_id_foreign` (`attendance_id`),
  CONSTRAINT `student_permits_attendance_id_foreign` FOREIGN KEY (`attendance_id`) REFERENCES `attendances` (`id`) ON DELETE CASCADE,
  CONSTRAINT `student_permits_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `students`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `students` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nis` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unique_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `school_class_id` bigint unsigned DEFAULT NULL,
  `photo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `face_descriptor` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `students_nis_unique` (`nis`),
  UNIQUE KEY `students_unique_id_unique` (`unique_id`),
  KEY `students_school_class_id_foreign` (`school_class_id`),
  KEY `students_user_id_foreign` (`user_id`),
  CONSTRAINT `students_school_class_id_foreign` FOREIGN KEY (`school_class_id`) REFERENCES `school_classes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `students_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `subject_attendances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subject_attendances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `schedule_id` bigint unsigned NOT NULL,
  `student_id` bigint unsigned NOT NULL,
  `teacher_id` bigint unsigned NOT NULL,
  `status` enum('hadir','sakit','izin','alpa','bolos') COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `academic_year_id` bigint unsigned DEFAULT NULL,
  `semester_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `subject_attendances_schedule_id_student_id_created_at_unique` (`schedule_id`,`student_id`,`created_at`),
  KEY `subject_attendances_student_id_foreign` (`student_id`),
  KEY `subject_attendances_teacher_id_foreign` (`teacher_id`),
  KEY `subject_attendances_academic_year_id_foreign` (`academic_year_id`),
  KEY `subject_attendances_semester_id_foreign` (`semester_id`),
  CONSTRAINT `subject_attendances_academic_year_id_foreign` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE SET NULL,
  CONSTRAINT `subject_attendances_schedule_id_foreign` FOREIGN KEY (`schedule_id`) REFERENCES `schedules` (`id`) ON DELETE CASCADE,
  CONSTRAINT `subject_attendances_semester_id_foreign` FOREIGN KEY (`semester_id`) REFERENCES `semesters` (`id`) ON DELETE SET NULL,
  CONSTRAINT `subject_attendances_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `subject_attendances_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `subject_teacher`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subject_teacher` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `subject_id` bigint unsigned NOT NULL,
  `teacher_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `subject_teacher_subject_id_foreign` (`subject_id`),
  KEY `subject_teacher_teacher_id_foreign` (`teacher_id`),
  CONSTRAINT `subject_teacher_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `subject_teacher_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `subjects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subjects` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `fase` enum('Fondasi','A','B','C','D','E','F') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kktp` int NOT NULL DEFAULT '70',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `subjects_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `teacher_attendances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teacher_attendances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `teacher_id` bigint unsigned NOT NULL,
  `status` enum('hadir','izin','sakit','alpa') COLLATE utf8mb4_unicode_ci NOT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `photo_evidence` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `checkout_time` timestamp NULL DEFAULT NULL,
  `checkout_photo_evidence` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `checkout_latitude` decimal(10,8) DEFAULT NULL,
  `checkout_longitude` decimal(11,8) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `academic_year_id` bigint unsigned DEFAULT NULL,
  `semester_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `teacher_attendances_teacher_id_foreign` (`teacher_id`),
  KEY `teacher_attendances_academic_year_id_foreign` (`academic_year_id`),
  KEY `teacher_attendances_semester_id_foreign` (`semester_id`),
  CONSTRAINT `teacher_attendances_academic_year_id_foreign` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE SET NULL,
  CONSTRAINT `teacher_attendances_semester_id_foreign` FOREIGN KEY (`semester_id`) REFERENCES `semesters` (`id`) ON DELETE SET NULL,
  CONSTRAINT `teacher_attendances_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `teacher_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teacher_notes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `teacher_id` bigint unsigned NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `teacher_notes_teacher_id_foreign` (`teacher_id`),
  CONSTRAINT `teacher_notes_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `teachers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teachers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nip` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `photo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `face_descriptor` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `teachers_nip_unique` (`nip`),
  KEY `teachers_user_id_foreign` (`user_id`),
  CONSTRAINT `teachers_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `teaching_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teaching_assignments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `school_class_id` bigint unsigned NOT NULL,
  `subject_id` bigint unsigned NOT NULL,
  `teacher_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `class_subject_unique` (`school_class_id`,`subject_id`),
  KEY `teaching_assignments_subject_id_foreign` (`subject_id`),
  KEY `teaching_assignments_teacher_id_foreign` (`teacher_id`),
  CONSTRAINT `teaching_assignments_school_class_id_foreign` FOREIGN KEY (`school_class_id`) REFERENCES `school_classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `teaching_assignments_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `teaching_assignments_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `teaching_journals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teaching_journals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `schedule_id` bigint unsigned NOT NULL,
  `teacher_id` bigint unsigned NOT NULL,
  `date` date NOT NULL,
  `material_content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `teaching_journals_schedule_id_foreign` (`schedule_id`),
  KEY `teaching_journals_teacher_id_foreign` (`teacher_id`),
  CONSTRAINT `teaching_journals_schedule_id_foreign` FOREIGN KEY (`schedule_id`) REFERENCES `schedules` (`id`) ON DELETE CASCADE,
  CONSTRAINT `teaching_journals_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `profile_photo_path` varchar(2048) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_seen_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (1,'0001_01_01_000000_create_users_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (2,'0001_01_01_000001_create_cache_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (3,'0001_01_01_000002_create_jobs_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (4,'2025_06_18_125621_create_students_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (5,'2025_06_18_125641_create_attendances_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (6,'2025_06_18_133611_add_role_to_users_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (7,'2025_06_19_033417_add_checkout_time_to_attendances_table',3);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (8,'2025_06_19_172252_add_status_to_attendances_table',4);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (9,'2025_06_19_173432_create_settings_table',5);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (12,'2025_06_20_152937_create_school_classes_table',6);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (13,'2025_06_20_153015_add_school_class_id_to_students_table',6);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (14,'2025_06_21_194028_create_parent_models_table',7);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (15,'2025_06_21_194123_create_parent_student_table',7);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (16,'2025_06_22_131235_create_teachers_table',8);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (17,'2025_06_22_194651_add_teacher_id_to_school_classes_table',9);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (18,'2025_06_22_230101_create_leave_requests_table',10);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (21,'2025_06_26_051524_add_gps_settings_to_settings_table',11);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (22,'2025_06_26_055736_add_last_seen_at_to_users_table',12);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (23,'2025_06_27_202946_create_announcements_table',13);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (25,'2025_07_07_193648_add_absent_notification_setting_to_settings_table',14);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (26,'2025_07_07_204032_create_notifications_table',15);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (27,'2025_07_16_193246_make_phone_number_nullable_in_parents_table',16);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (28,'2025_07_20_110415_create_conversations_table',17);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (29,'2025_07_20_110447_create_messages_table',17);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (30,'2025_07_21_204724_create_admin_conversations_table',18);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (31,'2025_07_21_204750_create_admin_messages_table',18);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (32,'2025_08_04_175929_create_student_permits_table',19);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (33,'2025_08_15_202821_create_subjects_table',20);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (34,'2025_08_15_203244_create_subject_teacher_pivot_table',20);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (35,'2025_08_15_221932_create_teaching_assignments_table',21);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (36,'2025_08_15_225608_create_levels_table',22);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (37,'2025_08_15_232625_add_level_id_to_school_classes_table',23);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (38,'2025_08_15_234353_create_schedules_table',24);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (39,'2025_08_16_113015_create_subject_attendances_table',25);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (40,'2025_08_16_171551_add_bolos_to_subject_attendances_status_column',26);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (41,'2025_08_18_171755_create_teacher_notes_table',27);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (42,'2025_09_20_170342_add_profile_photo_path_to_users_table',28);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (44,'2026_02_16_114419_add_photo_to_students_table',29);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (45,'2026_02_16_155156_create_teacher_attendances_table',30);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (46,'2026_02_16_155159_add_photo_column_to_teachers_table',30);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (47,'2026_02_16_174412_create_calendars_table',31);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (48,'2026_04_07_162806_add_is_self_study_to_calendars_table',32);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (49,'2026_04_08_120735_add_face_descriptor_to_students_and_teachers_tables',33);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (50,'2026_04_18_135551_create_personal_access_tokens_table',34);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (51,'2026_04_18_140600_create_teaching_journals_table',35);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (52,'2026_04_19_135830_add_photo_to_parents_table',36);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (53,'2026_04_29_222150_add_checkout_columns_to_teacher_attendances_table',37);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (54,'2026_04_29_222222_add_checkout_columns_to_teacher_attendances_table',37);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (55,'2026_04_29_233241_add_banner_to_announcements_table',37);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (56,'2026_04_29_233333_add_banner_to_announcements_table',37);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (57,'2026_05_03_000001_create_academic_periods_table',37);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (58,'2026_05_03_000002_create_extracurriculars_table',37);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (59,'2026_05_03_000003_create_extracurricular_attendances_table',37);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (60,'2026_05_03_000004_add_academic_periods_to_existing_attendances',37);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (61,'2026_05_05_201258_add_user_id_to_students_table',38);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (62,'2026_05_05_132006_create_lms_tables',39);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (63,'2026_05_05_214144_create_lms_sessions_table',40);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (64,'2026_05_07_144709_add_school_class_id_to_lms_assignments_table',41);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (65,'2026_05_07_145731_add_academic_period_to_lms_tables',42);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (66,'2026_05_07_150540_add_school_class_id_to_lms_materials_table',43);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (67,'2026_05_07_151030_create_lms_announcements_table',44);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (68,'2026_05_07_151444_create_lms_comments_table',45);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (69,'2026_05_07_154818_create_lms_reflections_table',46);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (70,'2026_05_07_155832_create_lms_learning_objectives_table',47);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (71,'2026_05_07_155910_add_type_and_tp_to_lms_assignments_table',47);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (72,'2026_05_07_190353_add_tp_to_lms_materials_table',48);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (73,'2026_05_07_192938_add_external_link_to_lms_materials_table',49);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (74,'2026_05_07_195916_add_instrument_type_to_lms_assignments_table',50);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (75,'2026_05_07_225858_add_thumbnail_to_lms_materials_table',51);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (76,'2026_05_08_100150_create_lms_material_resources_table',52);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (77,'2026_05_08_191423_add_order_to_tp_and_assignments',53);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (78,'2026_05_09_193420_add_school_class_id_to_lms_learning_objectives_table',54);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (79,'2026_05_10_100846_create_lms_student_materials_table',55);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (80,'2026_05_10_112546_add_passing_grade_to_lms_assignments_table',56);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (81,'2026_05_10_113441_add_attempts_to_lms_submissions_table',57);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (82,'2026_05_11_123030_create_notifications_table',58);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (83,'2026_05_11_130621_create_gradebook_final_scores_table',59);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (84,'2026_05_12_000000_create_student_diagnostic_results_table',60);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (85,'2026_05_13_000001_create_lms_capaian_pembelajaran_table',61);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (86,'2026_05_13_000002_add_cp_id_to_lms_learning_objectives',61);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (87,'2026_05_13_000003_add_fase_to_subjects',61);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (88,'2026_05_13_000004_create_lms_p5_dimensi_table',61);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (89,'2026_05_13_000005_create_lms_p5_elements_table',61);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (90,'2026_05_13_000006_create_lms_p5_sub_elements_table',61);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (91,'2026_05_13_000007_create_lms_p5_projects_table',61);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (92,'2026_05_13_000008_create_lms_p5_project_scores_table',61);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (93,'2026_05_14_000001_add_kktp_to_subjects_table',62);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (94,'2026_05_14_000002_create_lms_remedial_records_table',62);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (95,'2026_05_14_000003_create_student_non_cognitive_diagnostics_table',62);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (96,'2026_05_14_000004_create_lms_feedback_revisions_table',62);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (97,'2026_05_13_000009_add_sub_element_ids_to_p5_projects',63);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (98,'2026_05_14_000005_rename_teacher_feedback_to_feedback_in_lms_submissions',64);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (99,'2026_05_14_000006_add_cascade_delete_to_student_diagnostic_results',65);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (100,'2026_05_14_205819_enhance_lms_planning_tables',66);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (101,'2026_05_14_221119_make_cp_kode_nullable_in_lms_capaian_pembelajaran_table',67);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (102,'2026_05_14_232802_add_pedagogical_design_to_lms_materials_table',68);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (103,'2026_05_24_150000_create_lms_ai_prompts_table',69);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (104,'2026_05_24_160000_add_lkpd_and_image_prompt_to_lms_materials_table',70);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (105,'2026_05_24_170000_create_lms_ai_caches_table',71);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (106,'2026_05_25_120000_add_scoring_tool_to_lms_assignments_table',72);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (107,'2026_06_07_120000_add_remedial_fields_to_lms_submissions_table',73);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (108,'2026_06_12_100000_create_lms_material_school_class_table',74);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (109,'2026_06_12_100001_create_lms_assignment_school_class_table',74);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (110,'2026_06_12_202649_update_cascade_deletes_on_lms_tables',75);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (111,'2026_06_14_100000_create_lms_modul_ajars_table',76);
