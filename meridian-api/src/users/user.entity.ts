import { Exclude } from 'class-transformer';
import { Post } from 'src/post/post.entity';
import { Tweet } from 'src/tweets/entities/tweet.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  DeleteDateColumn,
} from 'typeorm';

export enum UserRole {
  Admin = 'admin',
  User = 'user',
  Moderator = 'moderator',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 100, nullable: false })
  firstName: string;

  @Column('varchar', { length: 100 })
  lastName: string;

  @Column('varchar', { unique: true, nullable: false })
  email: string;

  @Exclude()
  @Column('varchar', { nullable: false })
  password: string;

  // doing a one to many releatinship btw users entity and post entity
  @OneToMany(() => Post, (posts) => posts.author)
  posts: Post[];

  @OneToMany(() => Tweet, (tweet) => tweet.user)
  tweet: Tweet[];

  // Soft-delete marker (issue #427): when set the row is hidden from queries
  // but can be restored via POST /users/:id/restore
  @DeleteDateColumn()
  deletedAt?: Date;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.User })
  role: UserRole;

  // @Column({ default: true })
  // isActive: boolean;

  //   @OneToMany(type => Photo, photo => photo.user)
  //   photos: Photo[];
}
